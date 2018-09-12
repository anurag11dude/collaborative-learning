import { ProblemModel, ProblemModelType } from "./curriculum/problem";
import { UIModel, UIModelType } from "./ui";
import { UserModel, UserModelType } from "./user";
import { GroupsModel, GroupsModelType } from "./groups";
import { ClassModel, ClassModelType } from "./class";
import { WorkspacesModel, WorkspacesModelType } from "./workspaces";
import { DB } from "../lib/db";
import { UnitModelType, UnitModel } from "./curriculum/unit";
import { DemoModelType, DemoModel } from "./demo";

export type AppMode = "authed" | "dev" | "test" | "demo";

export interface IStores {
  appMode: AppMode;
  problem: ProblemModelType;
  user: UserModelType;
  ui: UIModelType;
  groups: GroupsModelType;
  class: ClassModelType;
  workspaces: WorkspacesModelType;
  db: DB;
  unit: UnitModelType;
  demo: DemoModelType;
  showDemoCreator: boolean;
}

export interface ICreateStores {
  appMode?: AppMode;
  problem?: ProblemModelType;
  user?: UserModelType;
  ui?: UIModelType;
  groups?: GroupsModelType;
  class?: ClassModelType;
  workspaces?: WorkspacesModelType;
  db?: DB;
  showDemoCreator?: boolean;
  unit?: UnitModelType;
  demo?: DemoModelType;
}

export function createStores(params?: ICreateStores): IStores {
  return {
    appMode: params && params.appMode ? params.appMode : "dev",
    // for ease of testing, we create a null problem if none is provided
    problem: params && params.problem || ProblemModel.create({ ordinal: 0, title: "Null Problem" }),
    user: params && params.user || UserModel.create({id: "0"}),
    ui: params && params.ui || UIModel.create({}),
    groups: params && params.groups || GroupsModel.create({}),
    class: params && params.class || ClassModel.create({name: "Null Class", classHash: ""}),
    db: params && params.db || new DB(),
    workspaces: params && params.workspaces || WorkspacesModel.create({}),
    unit: params && params.unit || UnitModel.create({title: "Null Unit"}),
    demo: params && params.demo || DemoModel.create({class: {id: "0", name: "Null Class"}}),
    showDemoCreator: params && params.showDemoCreator || false
  };
}