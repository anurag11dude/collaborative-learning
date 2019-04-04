import { types, Instance } from "mobx-state-tree";

export const kGraphToolID = "Graph";

export function defaultGraphContent() {
  return GraphContentModel.create({
    type: kGraphToolID
  });
}

export const GraphContentModel = types
  .model("GraphTool", {
    type: types.optional(types.literal(kGraphToolID), kGraphToolID),
    model: types.optional(types.string, "")
  })
  .actions(self => ({
    setModel(model: string) {
      self.model = model;
    }
  }));

export type GraphContentModelType = Instance<typeof GraphContentModel>;
