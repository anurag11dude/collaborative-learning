import { JXGChange, JXGChangeAgent } from "./jxg-changes";
import { objectChangeAgent } from "./jxg-object";
import { isPoint } from "./jxg-point";
import { getPointsForVertexAngle } from "./jxg-polygon";
import { assign, each, values } from "lodash";
import * as uuid from "uuid/v4";

export const isVertexAngle = (v: any) =>
                (v instanceof JXG.Curve) && (v.elType === "angle") &&
                (v.getAttribute("clientType") === "vertexAngle");

export const canSupportVertexAngle = (vertex: JXG.Point): boolean => {
  const children = values(vertex.childElements);
  const polygons = children.filter(child => child.elType === "polygon");
  const polygon = polygons.length === 1 ? polygons[0] as JXG.Polygon : undefined;
  return !!polygon && (polygon.vertices.length > 3);
};

export const getVertexAngle = (vertex: JXG.Point): JXG.Angle | undefined => {
  let vertexAngle: JXG.Angle | undefined;
  each(vertex.childElements, child => {
    if ((child.elType === "angle") && (child.getAttribute("clientType") === "vertexAngle")) {
      const childAngle = child as JXG.Angle;
      if (childAngle.point1.id === vertex.id) {
        vertexAngle = childAngle;
      }
    }
  });
  return vertexAngle;
};

export const updateVertexAngle = (angle: JXG.Angle) => {
  const centerPt = angle.point1;
  const parents = centerPt && getPointsForVertexAngle(centerPt as JXG.Point);
  // reverse the order of parents if necessary to guarantee that we
  // mark the correct side of the angle.
  if (parents && (parents[0].id === angle.point3.id) && (parents[2].id === angle.point2.id)) {
    const swap = angle.parents[1];
    angle.parents[1] = angle.parents[2];
    angle.parents[2] = swap;
    // cf. JXG.createAngle()
    angle.point = angle.point2 = angle.radiuspoint = parents[0];
    angle.pointsquare = angle.point3 = angle.anglepoint = parents[2];
    angle.updateDataArray();
  }
};

export function updateVertexAnglesFromObjects(objects: JXG.GeometryElement[]) {
  const affectedAngles: { [id: string]: JXG.GeometryElement } = {};

  // identify affected angles
  each(objects, (obj, id) => {
    if (isPoint(obj)) {
      each(obj.childElements, child => {
        if (isVertexAngle(child)) {
          affectedAngles[child.id] = child;
        }
      });
    }
  });

  // update affected angles
  let board: JXG.Board | undefined;
  each(affectedAngles, angle => {
    board = angle.board;
    updateVertexAngle(angle as JXG.Angle);
  });
  board && board.update();
}

export const vertexAngleChangeAgent: JXGChangeAgent = {
  create: (board: JXG.Board, change: JXGChange) => {
    const parents = (change.parents || [])
                      .map(id => board.objects[id as string])
                      .filter(pt => pt != null);
    // cf. http://jsxgraph.uni-bayreuth.de/wiki/index.php/Positioning_of_labels
    const overrides = { name() { return `${this.Value ? JXG.toFixed(this.Value() * 180 / Math.PI, 0) : ""}°`; },
                        clientType: "vertexAngle" };
    const props = assign({ id: uuid(), radius: 1 }, change.properties, overrides);
    return parents.length === 3 ? board.create("angle", parents, props) : undefined;
  },

  // update can be handled generically
  update: objectChangeAgent.update,

  // delete can be handled generically
  delete: objectChangeAgent.delete
};