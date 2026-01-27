import { FlowBuilderModel } from "../../models/FlowBuilder";
import { WebhookModel } from "../../models/Webhook";
import { randomString } from "../../utils/randomCode";
import QueueIntegrations from "../../models/QueueIntegrations";

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

    const duplicateName = `${flow.name} - copy`;
    const duplicate = await FlowBuilderModel.create({
      name: duplicateName,
      flow: flow.flow,
      user_id: flow.user_id,
      company_id: flow.company_id
    });

    const existingIntegration = await QueueIntegrations.findOne({
      where: {
        companyId: flow.company_id,
        type: "flowbuilder",
        name: duplicateName
      }
    });

    if (!existingIntegration) {
      await QueueIntegrations.create({
        type: "flowbuilder",
        name: duplicateName,
        projectName: duplicateName,
        jsonContent: "",
        urlN8N: "",
        language: "",
        companyId: flow.company_id
      });
    }

    return duplicate;
  } catch (error) {
    console.error("Erro ao inserir o usuário:", error);

    return error;
  }
};

export default DuplicateFlowBuilderService;
