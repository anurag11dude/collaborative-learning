import { JXGChangeAgent } from "./jxg-changes";
import { objectChangeAgent } from "./jxg-object";

export const isMovableLine = (v: any) => (v.elType === "line") && (v.getAttribute("clientType") === kMovableLineType);

export const isVisibleMovableLine = (v: any) => isMovableLine && v.visProp.visible;

export const kMovableLineType = "movableLine";

const gray = "#CCCCCC";
const blue = "#009CDC";
const darkBlue = "#000099";

export const kMovableLineDefaults = {
              fillColor: gray,
              strokeColor: blue,
              selectedFillColor: darkBlue,
              selectedStrokeColor: darkBlue
            };

const sharedProps = {
        fillColor: kMovableLineDefaults.fillColor,
        strokeColor: kMovableLineDefaults.strokeColor,
        clientType: kMovableLineType,
        strokeWidth: 3,
      };

const lineSpecificProps = {
  highlightStrokeOpacity: .5,
  highlightStrokeColor: kMovableLineDefaults.strokeColor,
  firstArrow: true,
  lastArrow: true,
};

const pointSpecificProps = {
  highlightStrokeColor: darkBlue,
};

export const movableLineChangeAgent: JXGChangeAgent = {
  create: (board, change) => {
    const changeProps: any = change.properties || {};
    const props = {...sharedProps, ...changeProps};
    const lineProps = {...props, ...lineSpecificProps};
    const pointProps = {...props, ...pointSpecificProps};
    const id = changeProps.id;

    if (change.parents && change.parents.length === 2) {
      const interceptPoint = (board as JXG.Board).create(
        "point",
        change.parents[0],
        {
          ...pointProps,
          id: `${id}-point1`
        }
      );
      const slopePoint = (board as JXG.Board).create(
        "point",
        change.parents[1],
        {
          ...pointProps,
          id: `${id}-point2`
        }
      );

      return (board as JXG.Board).create(
        "line",
        [interceptPoint, slopePoint],
        {
          ...lineProps,
          id,
          name: "y = mx + b",
          withLabel: true,
          label: {
            position: "top",
            anchorY: "bottom"
          }
        });
    }
  },

  // update can be handled generically
  update: objectChangeAgent.update,

  // delete can be handled generically
  delete: objectChangeAgent.delete
};
