import { Mutex } from "async-mutex";
import { Op } from "sequelize";
import Contact from "../../models/Contact";
import CreateOrUpdateContactService, {
  updateContact
} from "../ContactServices/CreateOrUpdateContactService";
import Message from "../../models/Message";
import Ticket from "../../models/Ticket";
import WhatsappLidMap from "../../models/WhatsapplidMap";
// Importar o módulo inteiro para acessar a fila
import * as queues from "../../queues";
import logger from "../../utils/logger";
import { IMe } from "./wbotMessageListener";
import { Session } from "../../libs/wbot";
import { isInvalidContactName, resolveBestContactName } from "../../utils/contactName";

const lidUpdateMutex = new Mutex();

export async function checkAndDedup(
  contact: Contact,
  lid: string
): Promise<void> {
  const lidContact = await Contact.findOne({
    where: {
      companyId: contact.companyId,
      number: {
        [Op.or]: [lid, lid.substring(0, lid.indexOf("@"))]
      }
    }
  });

  if (!lidContact) {
    return;
  }

  await Message.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  const allTickets = await Ticket.findAll({
    where: {
      contactId: lidContact.id,
      companyId: contact.companyId
    }
  });

  // Transfer all tickets to main contact instead of closing them
  await Ticket.update(
    { contactId: contact.id },
    {
      where: {
        contactId: lidContact.id,
        companyId: contact.companyId
      }
    }
  );

  if (allTickets.length > 0) {
    console.log(`[RDS CONTATO] Transferidos ${allTickets.length} tickets do contato ${lidContact.id} para ${contact.id}`);
  }

  // Delete the duplicate contact after transferring all data
  await lidContact.destroy();
}

export async function verifyContact(
  msgContact: IMe,
  wbot: Session,
  companyId: number
): Promise<Contact> {
  let profilePicUrl: string;

  // try {
  //   profilePicUrl = await wbot.profilePictureUrl(msgContact.id);
  // } catch (e) {
  //   profilePicUrl = `${process.env.FRONTEND_URL}/nopicture.png`;
  // }

  const isLid = msgContact.id.includes("@lid") || false;
  const isGroup = msgContact.id.includes("@g.us");
  const isWhatsappNet = msgContact.id.includes("@s.whatsapp.net");

  // Extrair o número do ID
  const idParts = msgContact.id.split('@');
  const extractedId = idParts[0];

  // Extrair qualquer número de telefone adicional que possa estar presente
  const extractedPhone = extractedId.split(':')[0]; // Remove parte após ":" se existir

  // Determinar número e LID adequadamente
  const senderPnNumber = msgContact.senderPn
    ? msgContact.senderPn.replace(/\D/g, "")
    : "";
  let originalLid = msgContact.lid || null;

  // Se o ID original já é @lid, usamos ele como lidJid
  const lidJid = isLid ? (originalLid || msgContact.id) : originalLid;

  // ⚠️ SEGURANÇA: Verificar se o que extraímos como "phone" não é na verdade um LID
  const extractionLikelyLid = extractedPhone && extractedPhone.length > 15 && !isGroup;

  let number = extractionLikelyLid ? "" : extractedPhone;

  if (isLid && senderPnNumber) {
    number = senderPnNumber;
  }

  // Se não temos número mas temos o senderPn disponível (comum em mídias com LID)
  if (!number && senderPnNumber) {
    number = senderPnNumber;
  }

  if (isLid || extractionLikelyLid) {
    logger.info(`[RDS-LID-FIX] Contato identificado como LID. ID: ${msgContact.id}, PN Sugerido: ${number || "nenhum"}`);
  }

  // Se o ID estiver no formato telefone:XX@s.whatsapp.net, extraia apenas o telefone
  if (isWhatsappNet && extractedId.includes(':')) {
    logger.info(`[RDS-LID-FIX] ID contém separador ':' - extraindo apenas o telefone: ${extractedPhone}`);
  }

  logger.info(`[RDS-LID-FIX] Processando contato - ID original: ${msgContact.id}, número extraído: ${number}, LID detectado: ${lidJid || "não"}`);

  const contactData = {
    name: msgContact?.name || msgContact.id.replace(/\D/g, ""),
    number,
    profilePicUrl,
    isGroup,
    companyId,
    lid: lidJid // Adicionar o LID aos dados do contato quando disponível
  };
  const resolvedName = resolveBestContactName({
    pushName: contactData.name,
    integrationName: contactData.name,
    profileName: contactData.name,
    number: contactData.number
  });

  if (isGroup) {
    return CreateOrUpdateContactService(contactData);
  }

  return lidUpdateMutex.runExclusive(async () => {
    let foundContact: Contact | null = null;

    // Alvo para busca por LID (pode vir de várias fontes)
    const targetLid = lidJid || originalLid || (extractionLikelyLid ? msgContact.id : null);

    if (isLid || extractionLikelyLid || originalLid) {
      if (senderPnNumber) {
        foundContact = await Contact.findOne({
          where: {
            companyId,
            number: senderPnNumber
          },
          include: ["tags", "extraInfo", "whatsappLidMap"]
        });
      }

      if (!foundContact && targetLid) {
        foundContact = await Contact.findOne({
          where: {
            companyId,
            [Op.or]: [
              { lid: targetLid },
              { number: targetLid.split("@")[0] },
              { remoteJid: targetLid }
            ]
          },
          include: ["tags", "extraInfo", "whatsappLidMap"]
        });

        // Se ainda não achou, busca no mapa de LIDs
        if (!foundContact) {
          const lidMap = await WhatsappLidMap.findOne({
            where: { companyId, lid: targetLid },
            include: [{ model: Contact, as: "contact", include: ["tags", "extraInfo"] }]
          });
          if (lidMap) foundContact = lidMap.contact;
        }
      }
    } else {
      foundContact = await Contact.findOne({
        where: {
          companyId,
          number: number
        },
      });
    }

    if (foundContact) {
      // Se achamos um contato e temos um LID novo para ele
      if (targetLid) {
        await checkAndDedup(foundContact, targetLid);

        const updateData: any = {};
        if (foundContact.lid !== targetLid) {
          updateData.lid = targetLid;
        }

        // Se o contato tinha um LID como número e agora temos o PN real, atualiza
        if (foundContact.number.length > 15 && number && number.length <= 15) {
          updateData.number = number;
        }

        if (Object.keys(updateData).length > 0) {
          await foundContact.update(updateData);
        }

        const lidMap = await WhatsappLidMap.findOne({
          where: {
            companyId,
            lid: targetLid,
            contactId: foundContact.id
          }
        });
        if (!lidMap) {
          await WhatsappLidMap.create({
            companyId,
            lid: targetLid,
            contactId: foundContact.id
          });
        }
      }

      const contactUpdates: Partial<Contact> = {
        profilePicUrl: contactData.profilePicUrl
      };
      if (!isGroup && isInvalidContactName(foundContact.name)) {
        contactUpdates.name = resolvedName;
      }
      return updateContact(foundContact, contactUpdates);
    }

    // Se não encontrou o contato, tentar resolver via onWhatsApp antes de criar
    if (!isGroup) {
      try {
        const ow = await wbot.onWhatsApp(msgContact.id);

        if (ow?.[0]?.exists) {
          let lid = ow?.[0]?.lid as string || targetLid;

          // Tentar extrair o número real da resposta onWhatsApp se o nosso estiver vazio
          let realNumber = number;
          if (!realNumber) {
            const owJid = (ow[0] as any).jid;
            if (owJid && !owJid.includes("@lid")) {
              realNumber = owJid.split("@")[0];
            }
          }

          if (lid) {
            const lidContact = await Contact.findOne({
              where: {
                companyId,
                [Op.or]: [
                  { lid: lid },
                  { number: lid.split("@")[0] },
                  { number: realNumber || "none" }
                ]
              },
              include: ["tags", "extraInfo"]
            });

            if (lidContact) {
              await lidContact.update({ lid });

              const [map, created] = await WhatsappLidMap.findOrCreate({
                where: { companyId, lid, contactId: lidContact.id },
                defaults: { companyId, lid, contactId: lidContact.id }
              });

              return updateContact(lidContact, {
                number: realNumber || lidContact.number,
                profilePicUrl: contactData.profilePicUrl
              });
            } else if (realNumber) {
              // Se temos um número real agora, criar com ele
              const newContact = await CreateOrUpdateContactService({
                ...contactData,
                number: realNumber,
                lid: lid
              });

              await WhatsappLidMap.findOrCreate({
                where: { companyId, lid, contactId: newContact.id },
                defaults: { companyId, lid, contactId: newContact.id }
              });

              return newContact;
            }
          }
        }
      } catch (error) {
        logger.error(`[RDS-LID-FIX] Erro ao verificar contato no WhatsApp: ${error.message}`);
      }
    }

    // Fallback final: se não temos número real e não achamos nada, 
    // evitamos criar um contato com LID como número se pudermos.
    // Se 'number' estiver vazio aqui, o CreateOrUpdateContactService pode falhar ou criar algo inválido.
    // Mas é melhor do que criar um duplicado se pudermos evitar.

    return CreateOrUpdateContactService(contactData);
  });
}
