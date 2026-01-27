import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";
import QueueIntegrations from "../../models/QueueIntegrations";

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


    if(nameExist){
      return 'exist'
    }

    const flow = await FlowBuilderModel.create({
      user_id: userId,
      company_id: companyId,
      name: name,
    });

    const existingIntegration = await QueueIntegrations.findOne({
      where: {
        companyId,
        type: "flowbuilder",
        name
      }
    });

    if (!existingIntegration) {
      await QueueIntegrations.create({
        type: "flowbuilder",
        name,
        projectName: name,
        jsonContent: "",
        urlN8N: "",
        language: "",
        companyId
      });
    }

    return flow;
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error
  }
};

export default CreateFlowBuilderService;
