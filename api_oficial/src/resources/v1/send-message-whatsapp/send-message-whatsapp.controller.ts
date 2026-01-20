import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  UseInterceptors,
  UploadedFile,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { SendMessageWhatsappService } from './send-message-whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { Public } from '../../../@core/guard/auth.decorator';

@Controller('v1/send-message-whatsapp')
@ApiTags('Send Message WhatsApp')
export class SendMessageWhatsappController {
  constructor(private readonly sendMessageService: SendMessageWhatsappService) {}

  @Public()
  @Post(':token')
  @ApiOperation({ summary: 'Enviar mensagem via WhatsApp Oficial' })
  @ApiResponse({ status: 200, description: 'Mensagem enviada com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro ao enviar mensagem' })
  @ApiResponse({ status: 404, description: 'Conexão não encontrada' })
  async sendMessage(
    @Param('token') token: string,
    @Body() sendMessageDto: SendMessageDto,
  ) {
    return this.sendMessageService.sendMessage(token, sendMessageDto);
  }

  @Public()
  @Post(':token/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload de mídia para envio posterior' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Upload realizado com sucesso' })
  @ApiResponse({ status: 400, description: 'Erro no upload' })
  async uploadMedia(
    @Param('token') token: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.sendMessageService.uploadMedia(token, file);
  }

  @Public()
  @Get(':token/status/:messageId')
  @ApiOperation({ summary: 'Consultar status de uma mensagem' })
  @ApiResponse({ status: 200, description: 'Status da mensagem' })
  async getMessageStatus(
    @Param('token') token: string,
    @Param('messageId') messageId: string,
  ) {
    return this.sendMessageService.getMessageStatus(token, messageId);
  }
}
