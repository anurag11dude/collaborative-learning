import { types } from "mobx-state-tree";
import { AuthenticatedUser, PortalFirebaseStudentJWT } from "../../lib/auth";
const initials = require("initials");

export const UserTypeEnum = types.enumeration("type", ["student", "teacher"]);
export type UserType = typeof UserTypeEnum.Type;

export const UserModel = types
  .model("User", {
    authenticated: false,
    id: "0",
    type: types.maybe(UserTypeEnum),
    name: "Anonymous User",
    className: "",
    classHash: "",
    offeringId: "",
    latestGroupId: types.maybe(types.string),
    portal: "",
    loggingRemoteEndpoint: types.maybe(types.string)
  })
  .actions((self) => ({
    setName(name: string) {
      self.name = name;
    },
    setAuthenticated(auth: boolean) {
      self.authenticated = auth;
    },
    setClassName(className: string) {
      self.className = className;
    },
    setLatestGroupId(latestGroupId?: string) {
      self.latestGroupId = latestGroupId;
    },
    setId(id: string) {
      self.id = id;
    },
    setAuthenticatedUser(user: AuthenticatedUser) {
      self.authenticated = true;
      self.name = user.fullName;
      self.latestGroupId = undefined;
      self.id = user.id;
      self.portal = user.portal;
      self.type = user.type;
      self.className = user.className;
      self.classHash = user.classHash;
      self.offeringId = user.offeringId;
      if (user.firebaseJWT && (user.firebaseJWT as PortalFirebaseStudentJWT).returnUrl) {
        self.loggingRemoteEndpoint = (user.firebaseJWT as PortalFirebaseStudentJWT).returnUrl;
      }
    },
  }))
  .views((self) => ({
    get initials() {
      return initials(self.name);
    }
  }));

export type UserModelType = typeof UserModel.Type;
