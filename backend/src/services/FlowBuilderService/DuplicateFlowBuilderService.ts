import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";
import CreateQueueIntegrationService from "../QueueIntegrationServices/CreateQueueIntegrationService";

interface Request {
  id: number;
}

const DuplicateFlowBuilderService = async ({
  id
}: Request): Promise<FlowBuilderModel> => {
  try {
    const flow = await FlowBuilderModel.findOne({
      where: {
        id: id
      }
    });

    const duplicate = await FlowBuilderModel.create({
      name: flow.name + " - copy",
      flow: flow.flow,
      user_id: flow.user_id,
      company_id: flow.company_id
    });

    // Criação automática da integração (igual ao CreateFlowBuilderService)
    try {
      await CreateQueueIntegrationService({
        type: "flowbuilder",
        name: duplicate.name,
        companyId: duplicate.company_id,
        projectName: duplicate.name,
        jsonContent: "{}",
        language: "pt",
        urlN8N: ""
      });
    } catch (integrationError) {
      console.error("Erro ao criar integração automática para o fluxo duplicado:", integrationError);
      // Não impede a duplicação caso a integração falhe
    }

    return duplicate;
  } catch (error) {
    console.error("Erro ao duplicar o fluxo:", error);

    return error;
  }
};

export default DuplicateFlowBuilderService;
