import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";
import QueueIntegrations from "../../models/QueueIntegrations";
import CreateQueueIntegrationService from "../QueueIntegrationServices/CreateQueueIntegrationService";
import AppError from "../../errors/AppError";

interface Request {
  userId: number;
  name: string;
  companyId: number
}

const CreateFlowBuilderService = async ({
  userId,
  name,
  companyId
}: Request): Promise<FlowBuilderModel | string> => {
  try {

    const nameExist = await FlowBuilderModel.findOne({
      where: {
        name,
        company_id: companyId
      }
    })

    if (nameExist) {
      return 'exist'
    }

    // Validação: Verificar se já existe uma integração com esse nome
    const integrationExist = await QueueIntegrations.findOne({
      where: {
        name,
        companyId
      }
    });

    if (integrationExist) {
      throw new AppError("Já existe uma integração com esse nome. Por favor, escolha outro nome para o fluxo.", 403);
    }

    const flow = await FlowBuilderModel.create({
      user_id: userId,
      company_id: companyId,
      name: name,
    });

    // Criação automática da integração
    try {
      await CreateQueueIntegrationService({
        type: "flowbuilder",
        name: flow.name,
        companyId: flow.company_id,
        projectName: flow.name,
        jsonContent: "{}",
        language: "pt",
        urlN8N: ""
      });
    } catch (error) {
      console.error("Erro ao criar integração automática para o fluxo:", error);
      // Não lançamos erro aqui para não impedir a criação do fluxo caso a integração falhe
    }

    return flow;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default CreateFlowBuilderService;
