import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../@core/infra/database/prisma.service';
import { RedisService } from '../../../@core/infra/redis/RedisService.service';
import { RabbitMQService } from '../../../@core/infra/rabbitmq/RabbitMq.service';
import { SocketService } from '../../../@core/infra/socket/socket.service';
import { MetaService } from '../../../@core/infra/meta/meta.service';
import { IWebhookWhatsApp, IMessage, IStatus, IValue } from './interfaces/IWebhookWhatsApp.inteface';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly rabbitmq: RabbitMQService,
    private readonly socket: SocketService,
    private readonly metaService: MetaService,
  ) {}

  async webhookCompany(
    companyId: number,
    conexaoId: number,
    mode: string,
    verify_token: string,
    challenge: string,
  ) {
    this.logger.log('Webhook validation - Company: ' + companyId + ', Conexao: ' + conexaoId);

    // Verificar se é modo subscribe
    if (mode !== 'subscribe') {
      throw new BadRequestException('Modo de verificacao invalido');
    }

    // PRIMEIRO: Verificar TOKEN_ADMIN (token master que funciona para todas as conexões)
    const tokenAdmin = process.env.TOKEN_ADMIN;
    if (tokenAdmin && verify_token === tokenAdmin) {
      this.logger.log('Webhook verificado com sucesso usando TOKEN_ADMIN');
      return parseInt(challenge);
    }

    // SEGUNDO: Verificar token específico da conexão
    const conexao = await this.prisma.whatsappOficial.findFirst({
      where: { id: conexaoId },
    });

    if (conexao && verify_token === conexao.token_mult100) {
      this.logger.log('Webhook verificado com sucesso usando token da conexao');
      return parseInt(challenge);
    }

    // Se chegou aqui, token inválido
    this.logger.warn('Token de verificacao invalido para Company: ' + companyId + ', Conexao: ' + conexaoId);
    throw new BadRequestException('Token de verificacao invalido');
  }

  async webhookCompanyConexao(
    companyId: number,
    conexaoId: number,
    data: IWebhookWhatsApp,
  ) {
    this.logger.log('Webhook recebido - Company: ' + companyId + ', Conexao: ' + conexaoId);

    try {
      // Buscar conexão
      const conexao = await this.prisma.whatsappOficial.findFirst({
        where: { id: conexaoId },
        include: { company: true },
      });

      if (!conexao) {
        this.logger.warn('Conexao ' + conexaoId + ' nao encontrada');
        return { success: false, error: 'Conexao nao encontrada' };
      }

      // Processar entradas do webhook
      for (const entry of data.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages') {
            await this.processMessages(conexao, change.value);
          }
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Erro ao processar webhook: ' + error.message);
      return { success: false, error: error.message };
    }
  }

  private async processMessages(conexao: any, value: IValue) {
    const { metadata, contacts, messages, statuses } = value;

    // Processar mensagens recebidas
    if (messages && messages.length > 0) {
      for (const message of messages) {
        await this.processIncomingMessage(conexao, message, contacts?.[0]);
      }
    }

    // Processar status de mensagens
    if (statuses && statuses.length > 0) {
      for (const status of statuses) {
        await this.processStatus(conexao, status);
      }
    }
  }

  private async processIncomingMessage(conexao: any, message: IMessage, contact: any) {
    this.logger.log('Processando mensagem ' + message.id + ' de ' + message.from);

    try {
      let mediaUrl = null;
      let mediaData = null;

      // Download de mídia se necessário
      if (['image', 'audio', 'video', 'document', 'sticker'].includes(message.type)) {
        const mediaObject = message[message.type];
        if (mediaObject?.id) {
          try {
            mediaData = await this.metaService.downloadMedia(
              mediaObject.id,
              conexao.send_token,
            );
            this.logger.log('Midia baixada: ' + mediaObject.id);
          } catch (err) {
            this.logger.warn('Falha ao baixar midia: ' + err.message);
          }
        }
      }

      // Montar payload para enviar ao backend principal
      const payload = {
        event: 'message.received',
        data: {
          conexaoId: conexao.id,
          companyId: conexao.companyId,
          messageId: message.id,
          from: message.from,
          timestamp: message.timestamp,
          type: message.type,
          contact: contact ? {
            name: contact.profile?.name,
            wa_id: contact.wa_id,
          } : null,
          message: this.extractMessageContent(message),
          media: mediaData,
          context: message.context,
        },
      };

      // Enviar via WebSocket para o backend principal
      await this.socket.sendMessage({
        token: conexao.token_mult100,
        fromNumber: message.from,
        nameContact: contact?.profile?.name || '',
        companyId: conexao.companyId,
        message: {
          type: message.type as any,
          timestamp: parseInt(message.timestamp),
          idMessage: message.id,
          text: message.text?.body,
          file: mediaData?.url,
          mimeType: mediaData?.mime_type,
          idFile: mediaData?.id,
          quoteMessageId: message.context?.id,
        },
      });

      // Publicar no RabbitMQ se configurado
      if (conexao.use_rabbitmq && conexao.rabbitmq_queue) {
        await this.rabbitmq.publish(conexao.rabbitmq_queue, JSON.stringify(payload));
      }

      // Marcar como lida (opcional - pode ser configurável)
      try {
        await this.metaService.markAsRead(
          conexao.phone_number_id,
          message.id,
          conexao.send_token,
        );
      } catch (err) {
        this.logger.warn('Falha ao marcar como lida: ' + err.message);
      }

      // Cache da última mensagem
      const cacheKey = 'lastmsg:' + conexao.id + ':' + message.from;
      await this.redis.set(
        cacheKey,
        JSON.stringify(payload),
        3600,
      );

    } catch (error) {
      this.logger.error('Erro ao processar mensagem: ' + error.message);
      throw error;
    }
  }

  private extractMessageContent(message: IMessage): any {
    switch (message.type) {
      case 'text':
        return { text: message.text?.body };
      
      case 'image':
        return {
          image: {
            id: message.image?.id,
            mime_type: message.image?.mime_type,
            caption: message.image?.caption,
          },
        };
      
      case 'audio':
        return {
          audio: {
            id: message.audio?.id,
            mime_type: message.audio?.mime_type,
          },
        };
      
      case 'video':
        return {
          video: {
            id: message.video?.id,
            mime_type: message.video?.mime_type,
            caption: message.video?.caption,
          },
        };
      
      case 'document':
        return {
          document: {
            id: message.document?.id,
            mime_type: message.document?.mime_type,
            filename: message.document?.filename,
            caption: message.document?.caption,
          },
        };
      
      case 'sticker':
        return {
          sticker: {
            id: message.sticker?.id,
            mime_type: message.sticker?.mime_type,
          },
        };
      
      case 'location':
        return {
          location: {
            latitude: message.location?.latitude,
            longitude: message.location?.longitude,
            name: message.location?.name,
            address: message.location?.address,
          },
        };
      
      case 'contacts':
        return { contacts: message.contacts };
      
      case 'interactive':
        return { interactive: message.interactive };
      
      case 'button':
        return { button: message.button };
      
      case 'reaction':
        return { reaction: message.reaction };
      
      default:
        return { raw: message };
    }
  }

  private async processStatus(conexao: any, status: IStatus) {
    this.logger.log('Status ' + status.status + ' para mensagem ' + status.id);

    const payload = {
      event: 'message.status',
      data: {
        conexaoId: conexao.id,
        companyId: conexao.companyId,
        messageId: status.id,
        status: status.status,
        timestamp: status.timestamp,
        recipient: status.recipient_id,
        conversation: status.conversation,
        pricing: status.pricing,
        errors: status.errors,
      },
    };

    // Enviar via WebSocket
    await this.socket.readMessage({
      messageId: status.id,
      companyId: conexao.companyId,
      token: conexao.token_mult100,
    });

    // Atualizar cache de status
    const statusKey = 'status:' + conexao.id + ':' + status.id;
    await this.redis.set(
      statusKey,
      status.status,
      86400,
    );
  }
}
