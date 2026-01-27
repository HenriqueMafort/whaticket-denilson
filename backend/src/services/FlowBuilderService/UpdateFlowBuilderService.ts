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

    if(nameExist){
      return 'exist'
    }

    const flow = await FlowBuilderModel.findOne({
      where: { id: flowId, company_id: companyId }
    });

    if (!flow) {
      return 'exist';
    }

    const previousName = flow.name;

    await FlowBuilderModel.update({ name }, {
      where: {id: flowId, company_id: companyId}
    });

    if (previousName && previousName !== name) {
      await QueueIntegrations.update(
        { name, projectName: name },
        {
          where: {
            companyId,
            type: "flowbuilder",
            name: previousName
          }
        }
      );
    }

    return 'ok';
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default UpdateFlowBuilderService;
