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

  await flow.destroy();

  await QueueIntegrations.destroy({
    where: {
      companyId: flow.company_id,
      type: "flowbuilder",
      name: flow.name
    }
  });

  return flow;
};

export default DeleteFlowBuilderService;

