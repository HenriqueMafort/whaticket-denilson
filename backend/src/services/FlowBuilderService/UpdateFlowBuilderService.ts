import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";
import QueueIntegrations from "../../models/QueueIntegrations";

interface Request {
  companyId: number;
  name: string;
  flowId: number;
}

const UpdateFlowBuilderService = async ({
  companyId,
  name,
  flowId
}: Request): Promise<String> => {
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

    const flowInstance = await FlowBuilderModel.findOne({
      where: { id: flowId, company_id: companyId }
    });

    if (!flowInstance) {
      return 'error';
    }

    const oldName = flowInstance.name;

    await flowInstance.update({ name });

    // Atualizar integração associada se o nome mudou
    if (oldName !== name) {
      try {
        const integration = await QueueIntegrations.findOne({
          where: {
            name: oldName,
            companyId: companyId,
            type: 'flowbuilder'
          }
        });

        if (integration) {
          await integration.update({
            name: name,
            projectName: name
          });
        }
      } catch (error) {
        console.error("Erro ao atualizar integração automática:", error);
      }
    }

    return 'ok';
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default UpdateFlowBuilderService;
