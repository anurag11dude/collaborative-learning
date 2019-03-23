import { types, Instance } from "mobx-state-tree";

export const kFlowToolID = "Flow";

export function defaultFlowContent() {
  return FlowContentModel.create({
    type: kFlowToolID
  });
}

export const FlowContentModel = types
  .model("FlowTool", {
    type: types.optional(types.literal(kFlowToolID), kFlowToolID),
    model: types.optional(types.string, "")
  })
  .actions(self => ({
    setModel(model: string) {
      self.model = model;
    }
  }));

export type FlowContentModelType = Instance<typeof FlowContentModel>;
