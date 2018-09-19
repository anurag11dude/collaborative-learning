import { types, Instance } from "mobx-state-tree";
import { DataSet } from "./data/data-set";
import { ToolTileModel } from "./tools/tool-tile";
import { create } from "domain";

export const DocumentContentModel = types
  .model("DocumentContent", {
    tiles: types.array(ToolTileModel),
    // data shared between tools
    shared: types.maybe(DataSet)
  })
  .views(self => {
    return {
      get isEmpty() {
        return self.tiles.length === 0;
      }
    };
  })
  .actions((self) => ({
    addGeometryTile() {
      const axisMin = -0.5;
      const xAxisMax = 20;
      const yAxisMax = 5;
      const createBoardChange = {
        operation: "create",
        target: "board",
        properties: {
          axis: true,
          boundingBox: [axisMin, yAxisMax, xAxisMax, axisMin]
        }
      };
      const changeJson = JSON.stringify(createBoardChange);
      self.tiles.push(ToolTileModel.create({
        layout: {
          height: 200
        },
        content: {
          type: "Geometry",
          changes: [changeJson]
        }
      }));
    },
    addTextTile(initialText?: string) {
      self.tiles.push(ToolTileModel.create({
        content: {
          type: "Text",
          text: initialText
        }
      }));
    }
  }));

export type DocumentContentModelType = Instance<typeof DocumentContentModel>;
