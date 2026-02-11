import AppError from "../../errors/AppError";
import { FlowBuilderModel } from "../../models/FlowBuilder";
import QueueIntegrations from "../../models/QueueIntegrations";

const DeleteFlowBuilderService = async (id: number): Promise<FlowBuilderModel> => {

  const flow = await FlowBuilderModel.findOne({
    where: { id: id }
  });

  if (!flow) {
    throw new AppError("ERR_NO_TICKET_FOUND", 404);
  }

  // Deletar integração associada
  try {
    const integration = await QueueIntegrations.findOne({
      where: {
        name: flow.name,
        companyId: flow.company_id,
        type: 'flowbuilder'
      }
    });

    if (integration) {
      await integration.destroy();
    }
  } catch (error) {
    console.error("Erro ao deletar integração automática:", error);
  }

  await flow.destroy();

  return flow;
};

export default DeleteFlowBuilderService;

