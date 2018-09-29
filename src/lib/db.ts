import * as firebase from "firebase";
import { AppMode, IStores } from "../models/stores";
import { UserModelType, UserModel } from "../models/user";
import { onSnapshot } from "mobx-state-tree";
import { IDisposer } from "mobx-state-tree/dist/utils";
import { observable } from "mobx";
import { DBOfferingGroup,
         DBOfferingGroupUser,
         DBOfferingGroupMap,
         DBOfferingUser,
         DBDocumentMetadata,
         DBDocument,
         DBOfferingUserSectionDocument,
         DBOfferingUserSectionDocumentMap,
         DBDocumentType,
         DBLearningLog
        } from "./db-types";
import { WorkspaceModelType,
         SectionWorkspaceModelType,
         SectionWorkspaceModel,
         LearningLogWorkspaceModelType,
         LearningLogWorkspaceModel,
         WorkspacesModel } from "../models/workspaces";
import { DocumentModelType, DocumentModel } from "../models/document";
import { DocumentContentModel, DocumentContentModelType } from "../models/document-content";
import { ToolTileModelType } from "../models/tools/tool-tile";
import { TextContentModelType } from "../models/tools/text/text-content";
import { urlParams } from "../utilities/url-params";

export type IDBConnectOptions = IDBAuthConnectOptions | IDBNonAuthConnectOptions;
export interface IDBAuthConnectOptions {
  appMode: "authed";
  rawFirebaseJWT: string;
  stores: IStores;
}
export interface IDBNonAuthConnectOptions {
  appMode: "dev" | "test" | "demo" | "qa";
  stores: IStores;
}
export interface UserGroupMap {
  [key: string]: {
    group: number,
    initials: string
  };
}
export interface GroupUsersMap {
  [key: string]: string[];
}

export interface ModelListeners {
  [key /* unique Key */: string]: {
    ref?: firebase.database.Reference;
    modelDisposer?: IDisposer;
  };
}

export interface UserSectionDocumentListeners {
  [key /* sectionId */: string]: {
    [key /* userId */: string]: {
      sectionDocsRef?: firebase.database.Reference;
      docContentRef?: firebase.database.Reference;
    };
  };
}

export interface WorkspaceModelDisposers {
  [key /* sectionId */: string]: IDisposer;
}

export type DBClearLevel = "all" | "class" | "offering";

export class DB {
  @observable public isListening = false;
  @observable public groups: GroupUsersMap = {};
  public _private = {
    parseDocumentContent: this.parseDocumentContent
  };
  private appMode: AppMode;
  private firebaseUser: firebase.User | null = null;
  private stores: IStores;
  private latestGroupIdRef: firebase.database.Reference | null = null;
  private groupsRef: firebase.database.Reference | null = null;
  private groupOnDisconnect: firebase.database.OnDisconnect | null = null;
  private connectedRef: firebase.database.Reference | null = null;
  private workspaceRef: firebase.database.Reference | null  = null;
  private modelListeners: ModelListeners = {};
  private groupUserSectionDocumentsListeners: UserSectionDocumentListeners = {};
  private workspaceModelDisposers: WorkspaceModelDisposers = {};
  private learningLogsRef: firebase.database.Reference | null  = null;
  private creatingWorkspaces: string[] = [];

  public get isConnected() {
    return this.firebaseUser !== null;
  }

  public connect(options: IDBConnectOptions) {
    return new Promise<void>((resolve, reject) => {
      if (this.isConnected) {
        reject("Already connected to database!");
      }

      // check for already being initialized for tests
      if (firebase.apps.length === 0) {
        firebase.initializeApp({
          apiKey: "AIzaSyBKwTfDSxKRSTnOaAzI-mUBN78LiI2gM78",
          authDomain: "collaborative-learning-ec215.firebaseapp.com",
          databaseURL: "https://collaborative-learning-ec215.firebaseio.com",
          projectId: "collaborative-learning-ec215",
          storageBucket: "collaborative-learning-ec215.appspot.com",
          messagingSenderId: "112537088884"
        });
      }

      this.stores = options.stores;

      if (options.appMode === "authed") {
        firebase.auth()
          .signInWithCustomToken(options.rawFirebaseJWT)
          .catch(reject);
      }
      else {
        firebase.auth()
          .signInAnonymously()
          .catch(reject);
      }

      firebase.auth().onAuthStateChanged((firebaseUser) => {
        if (firebaseUser) {
          this.appMode = options.appMode;
          this.firebaseUser = firebaseUser;
          this.stopListeners();
          this.startListeners().then(resolve).catch(reject);
        }
      });
    });
  }

  public disconnect() {
    this.stopListeners();

    if (this.appMode === "test") {
      // delete all test data (for this unique anonymous test user)
      return this.ref().set(null);
    }
  }

  public joinGroup(groupId: string) {
    const {user} = this.stores;
    const groupRef = this.ref(this.getGroupPath(user, groupId));
    let userRef: firebase.database.Reference;

    return new Promise<void>((resolve, reject) => {
      groupRef.once("value")
        .then((snapshot) => {
          // if the group doesn't exist create it
          if (!snapshot.val()) {
            return groupRef.set({
              version: "1.0",
              self: {
                classHash: user.classHash,
                offeringId: user.offeringId,
                groupId,
              },
              users: {},
            } as DBOfferingGroup);
          }
        })
        .then(() => {
          // always add the user to the group, the listeners will sort out if the group is oversubscribed
          userRef = groupRef.child("users").child(user.id);
          return userRef.set({
            version: "1.0",
            self: {
              classHash: user.classHash,
              offeringId: user.offeringId,
              groupId,
              uid: user.id
            },
            connectedTimestamp: firebase.database.ServerValue.TIMESTAMP
          } as DBOfferingGroupUser);
        })
        .then(() => {
          return this.setConnectionHandlers(userRef);
        })
        .then(() => {
          // remember the last group joined
          return this.getLatestGroupIdRef().set(groupId);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  public leaveGroup() {
    const {user} = this.stores;
    const groupsRef = this.ref(this.getGroupsPath(user));

    if (this.groupOnDisconnect) {
      this.groupOnDisconnect.cancel();
    }
    this.groupOnDisconnect = null;

    return new Promise<void>((resolve, reject) => {
      groupsRef.once("value")
        .then((snapshot) => {
          // find all groups where the user is a member, this should be only 0 or 1 but just in case...
          const groups: DBOfferingGroupMap = snapshot.val() || {};
          const myGroupIds = Object.keys(groups).filter((groupId) => {
            const users = groups[groupId].users || {};
            return Object.keys(users).indexOf(user.id) !== -1;
          });

          // set out user in each group to null
          if (myGroupIds.length > 0) {
            const updates: any = {};
            myGroupIds.forEach((groupId) => {
              updates[this.getFullPath(this.getGroupUserPath(user, groupId))] = null;
            });
            return firebase.database().ref().update(updates);
          }
        })
        .then(() => {
          this.getLatestGroupIdRef().set(null);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  public createSectionWorkspace(sectionId: string) {
    return new Promise<SectionWorkspaceModelType>((resolve, reject) => {
      this.creatingWorkspaces.push(sectionId);

      const {user, workspaces, ui} = this.stores;
      const offeringUserRef = this.ref(this.getOfferingUserPath(user));
      const sectionDocumentRef = this.ref(this.getSectionDocumentPath(user, sectionId));

      return offeringUserRef.once("value")
        .then((snapshot) => {
          // ensure the offering user exists
          if (!snapshot.val()) {
            const offeringUser: DBOfferingUser = {
              version: "1.0",
              self: {
                classHash: user.classHash,
                offeringId: user.offeringId,
                uid: user.id,
              }
            };
            return offeringUserRef.set(offeringUser);
          }
         })
        .then(() => {
          // check if the section document exists
          return sectionDocumentRef.once("value")
            .then((snapshot) => {
              return snapshot.val() as DBOfferingUserSectionDocument|null;
            });
        })
        .then((sectionDocument) => {
          if (sectionDocument) {
            return sectionDocument;
          }
          else {
            // create the document and section document
            return this.createDocument("section")
              .then(({document, metadata}) => {
                  sectionDocument = {
                    version: "1.0",
                    self: {
                      classHash: user.classHash,
                      offeringId: user.offeringId,
                      uid: user.id,
                      sectionId
                    },
                    visibility: "private",
                    documentKey: document.self.documentKey,
                  };
                  return sectionDocumentRef.set(sectionDocument).then(() => sectionDocument!);
              });
          }
        })
        .then((sectionDocument) => {
          return this.openSectionWorkspace(sectionDocument.self.sectionId);
        })
        .then((sectionWorkspace) => {
          workspaces.addSectionWorkspace(sectionWorkspace);
          this.creatingWorkspaces.splice(this.creatingWorkspaces.indexOf(sectionId), 1);
          return sectionWorkspace;
        })
        .then(resolve)
        .catch(reject);
    });
  }

  public openSectionWorkspace(sectionId: string) {
    const { user } = this.stores;

    return new Promise<SectionWorkspaceModelType>((resolve, reject) => {
      const sectionDocumentRef = this.ref(this.getSectionDocumentPath(user, sectionId));
      return sectionDocumentRef.once("value")
        .then((snapshot) => {
          const sectionDocument: DBOfferingUserSectionDocument|null = snapshot.val();
          if (!sectionDocument) {
            throw new Error("Unable to find workspace document in db!");
          }
          return sectionDocument;
        })
        .then((sectionDocument) => {
          return this.createWorkspaceFromSectionDocument(user.id, sectionDocument);
        })
        .then((workspace) => {
          this.updateGroupUserSectionDocumentListeners(workspace);
          this.monitorSectionWorkspaceVisibility(workspace);
          resolve(workspace);
        })
        .catch(reject);
    });
  }

  public createDocument(type: DBDocumentType) {
    const {user} = this.stores;
    return new Promise<{document: DBDocument, metadata: DBDocumentMetadata}>((resolve, reject) => {
      const documentRef = this.ref(this.getUserDocumentPath(user)).push();
      const documentKey = documentRef.key!;
      const metadataRef = this.ref(this.getUserDocumentMetadataPath(user, documentKey));
      const document: DBDocument = {
        version: "1.0",
        self: {
          uid: user.id,
          documentKey,
        }
      };
      let metadata: DBDocumentMetadata;

      if (type === "section") {
        metadata = {
          version: "1.0",
          self: {
            uid: user.id,
            documentKey,
          },
          createdAt: firebase.database.ServerValue.TIMESTAMP as number,
          type: "section",
          classHash: user.classHash,
          offeringId: user.offeringId
        };
      }
      else {
        metadata = {
          version: "1.0",
          self: {
            uid: user.id,
            documentKey,
          },
          createdAt: firebase.database.ServerValue.TIMESTAMP as number,
          type: "learningLog"
        };
      }

      return documentRef.set(document)
        .then(() => metadataRef.set(metadata))
        .then(() => {
          resolve({document, metadata});
        })
        .catch(reject);
    });
  }

  public openDocument(userId: string, documentKey: string) {
    const { user } = this.stores;
    return new Promise<DocumentModelType>((resolve, reject) => {
      const documentRef = this.ref(this.getUserDocumentPath(user, documentKey, userId));
      const metadataRef = this.ref(this.getUserDocumentMetadataPath(user, documentKey, userId));

      return Promise.all([documentRef.once("value"), metadataRef.once("value")])
        .then(([documentSnapshot, metadataSnapshot]) => {
          const document: DBDocument|null = documentSnapshot.val();
          const metadata: DBDocumentMetadata|null = metadataSnapshot.val();
          if (!document || !metadata) {
            throw new Error(`Unable to open document ${documentKey}`);
          }

          const content = this.parseDocumentContent(document, true);
          return DocumentModel.create({
            uid: document.self.uid,
            key: document.self.documentKey,
            createdAt: metadata.createdAt,
            content: content ? content : {}
          });
        })
        .then((document) => {
          resolve(document);
        })
        .catch(reject);
    });
  }

  public createLearningLogWorkspace(title: string) {
    const {user} = this.stores;

    return new Promise<LearningLogWorkspaceModelType>((resolve, reject) => {
      return this.createDocument("learningLog")
        .then(({document, metadata}) => {
          const {documentKey} = document.self;
          const learningLog: DBLearningLog = {
            version: "1.0",
            self: {
              documentKey,
              uid: user.id,
            },
            title
          };
          return this.ref(this.getLearningLogPath(user, documentKey)).set(learningLog).then(() => learningLog);
        })
        .then((learningLog) => {
          return this.createWorkspaceFromLearningLog(learningLog);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  public openLearningLogWorkspace(documentKey: string) {
    const { user } = this.stores;

    return new Promise<LearningLogWorkspaceModelType>((resolve, reject) => {
      const learningLogRef = this.ref(this.getLearningLogPath(user, documentKey));
      return learningLogRef.once("value")
        .then((snapshot) => {
          const learningLog: DBLearningLog|null = snapshot.val();
          if (!learningLog) {
            throw new Error("Unable to find learning log in db!");
          }
          return learningLog;
        })
        .then((learningLog) => {
          return this.createWorkspaceFromLearningLog(learningLog);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  public publishDocument(document: DocumentModelType) {
    const { user } = this.stores;
    const content = JSON.stringify(document.content);
    const publicationsRef = this.ref(this.getPublicationsPath(user)).push();
    const publicationKey = publicationsRef.key!;
    const storedDoc: DBDocument = {
      content,
      version: "1.0",
      self: {
        uid: document.uid,
        documentKey: publicationKey
      }
    };
    return publicationsRef.set(storedDoc);
  }

  public ref(path: string = "") {
    if (!this.isConnected) {
      throw new Error("ref() requested before db connected!");
    }
    return firebase.database().ref(this.getFullPath(path));
  }

  public getFullPath(path: string = "") {
    return `${this.getRootFolder()}${path}`;
  }

  public getRootFolder() {
    // in the form of /(dev|test|demo|authed)/[<firebaseUserId> if dev or test]/portals/<escapedPortalDomain>
    const { appMode } = this;
    const parts = [`${appMode}`];

    if ((appMode === "dev") || (appMode === "test")) {
      parts.push(this.firebaseUser ? `${this.firebaseUser.uid}` : "no-user-id");
    }
    parts.push("portals");
    parts.push(this.escapeKey(this.stores.user.portal));

    return `/${parts.join("/")}/`;
  }

  public escapeKey(s: string): string {
    return s.replace(/[.$[\]#\/]/g, "_");
  }

  public clear(level: DBClearLevel) {
    return new Promise<void>((resolve, reject) => {
      const {user} = this.stores;
      const clearPath = (path?: string) => {
        this.ref(path).set(null).then(resolve).catch(reject);
      };

      if (this.stores.appMode !== "qa") {
        return reject("db#clear is only available in qa mode");
      }

      switch (level) {
        case "all":
          clearPath();
          break;
        case "class":
          clearPath(this.getClassPath(user));
          break;
        case "offering":
          clearPath(this.getOfferingPath(user));
          break;
        default:
          reject(`Invalid clear level: ${level}`);
          break;
      }
    });
  }

  //
  // Paths
  //

  public getUserPath(user: UserModelType, userId?: string) {
    return `users/${userId || user.id}`;
  }

  public getUserDocumentPath(user: UserModelType, documentKey?: string, userId?: string) {
    const suffix = documentKey ? `/${documentKey}` : "";
    return `${this.getUserPath(user, userId)}/documents${suffix}`;
  }

  public getUserDocumentMetadataPath(user: UserModelType, documentKey?: string, userId?: string) {
    const suffix = documentKey ? `/${documentKey}` : "";
    return `${this.getUserPath(user, userId)}/documentMetadata${suffix}`;
  }

  public getLearningLogPath(user: UserModelType, documentKey?: string, userId?: string) {
    const suffix = documentKey ? `/${documentKey}` : "";
    return `${this.getUserPath(user, userId)}/learningLogs${suffix}`;
  }

  public getClassPath(user: UserModelType) {
    return `classes/${user.classHash}`;
  }

  public getOfferingPath(user: UserModelType) {
    return `${this.getClassPath(user)}/offerings/${user.offeringId}`;
  }

  public getOfferingUsersPath(user: UserModelType) {
    return `${this.getOfferingPath(user)}/users`;
  }

  public getOfferingUserPath(user: UserModelType, userId?: string) {
    return `${this.getOfferingUsersPath(user)}/${userId || user.id}`;
  }

  public getSectionDocumentPath(user: UserModelType, sectionId?: string, userId?: string) {
    const suffix = sectionId ? `/${sectionId}` : "";
    return `${this.getOfferingUserPath(user, userId)}/sectionDocuments${suffix}`;
  }

  public getGroupsPath(user: UserModelType) {
    return `${this.getOfferingPath(user)}/groups`;
  }

  public getGroupPath(user: UserModelType, groupId: string) {
    return `${this.getGroupsPath(user)}/${groupId}`;
  }

  public getGroupUserPath(user: UserModelType, groupId: string, userId?: string) {
    return `${this.getGroupPath(user, groupId)}/users/${userId || user.id}`;
  }

  public getPublicationsPath(user: UserModelType) {
    return `${this.getOfferingPath(user)}/publications/`;
  }

  //
  // Listeners
  //

  private startListeners() {
    return new Promise<void>((resolve, reject) => {
      // listeners must start in this order so we know the latest group joined so we can autojoin groups if needed
      this.startLatestGroupIdListener()
        .then(() => {
          return this.startGroupsListener();
        })
        .then(() => {
          return this.startWorkspaceListener();
        })
        .then(() => {
          return this.startLearningLogsListener();
        })
        .then(() => {
          this.isListening = true;
        })
        .then(resolve)
        .catch(reject);
    });
  }

  private stopListeners() {
    this.stopLatestGroupIdListener();
    this.stopGroupListeners();
    this.stopWorkspaceListener();
    this.stopModelListeners();
    this.stopLearningLogsListener();
    this.isListening = false;
  }

  private startLatestGroupIdListener() {
    return new Promise<void>((resolve, reject) => {
      const latestGroupIdRef = this.latestGroupIdRef = this.getLatestGroupIdRef();
      // use once() so we are ensured that latestGroupId is set before we resolve
      latestGroupIdRef.once("value", (snapshot) => {
        this.handleLatestGroupIdRef(snapshot);
        latestGroupIdRef.on("value", this.handleLatestGroupIdRef);
      })
      .then(snapshot => {
        resolve();
      })
      .catch(reject);
    });
  }

  private getLatestGroupIdRef() {
    return this.ref(this.getUserPath(this.stores.user)).child("latestGroupId");
  }

  private stopLatestGroupIdListener() {
    if (this.latestGroupIdRef) {
      this.latestGroupIdRef.off("value");
      this.latestGroupIdRef = null;
    }
  }

  private stopModelListeners() {
    Object.keys(this.modelListeners).forEach((docKey) => {
      const listeners = this.modelListeners[docKey];
      if (listeners) {
        if (listeners.modelDisposer) {
          listeners.modelDisposer();
        }

        if (listeners.ref) {
          listeners.ref.off();
        }
      }
    });
  }

  private handleLatestGroupIdRef = (snapshot: firebase.database.DataSnapshot) => {
    this.stores.user.setLatestGroupId(snapshot.val() || undefined);
  }

  private startGroupsListener() {
    return new Promise<void>((resolve, reject) => {
      const {user, groups} = this.stores;
      const groupsRef = this.groupsRef = this.ref(this.getGroupsPath(user));

      // use once() so we are ensured that groups are set before we resolve
      groupsRef.once("value")
        .then((snapshot) => {
          const dbGroups: DBOfferingGroupMap = snapshot.val() || {};
          // Groups may be invalid at this point, but the listener will resolve it once connection times are set
          groups.updateFromDB(user.id, dbGroups, this.stores.class);

          const group = groups.groupForUser(user.id);
          if (group) {
            // update our connection time so we report as connected/disconnected
            const userRef = this.ref(this.getGroupUserPath(user, group.id));
            return this.setConnectionHandlers(userRef);
          }
          else if (user.latestGroupId) {
            // if we are not currently in a group try to join the latest group
            return this.joinGroup(user.latestGroupId);
          }
        })
        .then(() => {
          groupsRef.on("value", this.handleGroupsRef);
        })
        .then(resolve)
        .catch(reject);
    });
  }

  private stopGroupListeners() {
    if (this.groupsRef) {
      this.groupsRef.off("value", this.handleGroupsRef);
      this.groupsRef = null;
    }
  }

  private startWorkspaceListener() {
    this.workspaceRef = this.ref(this.getSectionDocumentPath(this.stores.user));
    this.workspaceRef.on("child_added", this.handleWorkspaceChildAdded);
  }

  private stopWorkspaceListener() {
    if (this.workspaceRef) {
      this.workspaceRef.off("child_added", this.handleWorkspaceChildAdded);
    }

    Object.keys(this.workspaceModelDisposers).forEach((sectionId) => {
      this.workspaceModelDisposers[sectionId]();
    });
  }

  private startLearningLogsListener() {
    this.learningLogsRef = this.ref(this.getLearningLogPath(this.stores.user));
    this.learningLogsRef.on("child_added", this.handleLearningLogChildAdded);
    this.learningLogsRef.on("child_changed", this.handleLearningLogChildChanged);
    this.learningLogsRef.on("child_removed", this.handleLearningLogChildRemoved);
  }

  private stopLearningLogsListener() {
    if (this.learningLogsRef) {
      this.learningLogsRef.off("child_added", this.handleLearningLogChildAdded);
      this.learningLogsRef.off("child_changed", this.handleLearningLogChildChanged);
      this.learningLogsRef.off("child_removed", this.handleLearningLogChildRemoved);
    }
  }

  private handleLearningLogChildAdded = (snapshot: firebase.database.DataSnapshot) => {
    const {workspaces} = this.stores;
    const learningLog: DBLearningLog|null = snapshot.val();
    if (learningLog) {
      this.createWorkspaceFromLearningLog(learningLog)
        .then(this.monitorLearningLogWorkspace)
        .then(workspaces.addLearningLogWorkspace);
    }
  }

  private handleLearningLogChildChanged = (snapshot: firebase.database.DataSnapshot) => {
    const {workspaces} = this.stores;
    const learningLog: DBLearningLog|null = snapshot.val();
    if (learningLog) {
      const learningLogWorkspace = workspaces.getLearningLogWorkspace(learningLog.self.documentKey);
      if (learningLogWorkspace) {
        learningLogWorkspace.setTitle(learningLog.title);
        // TODO: for future drag to order story add ordinal to learning log and update here
      }
    }
  }

  private handleLearningLogChildRemoved = (snapshot: firebase.database.DataSnapshot) => {
    const {workspaces} = this.stores;
    const learningLog: DBLearningLog|null = snapshot.val();
    if (learningLog) {
      const learningLogWorkspace = workspaces.getLearningLogWorkspace(learningLog.self.documentKey);
      if (learningLogWorkspace) {
        workspaces.deleteLearningLogWorkspace(learningLogWorkspace);
        // TODO: still need UI for delete
      }
    }
  }

  private handleWorkspaceChildAdded = (snapshot: firebase.database.DataSnapshot) => {
    const {user, workspaces, ui} = this.stores;
    const sectionDocument: DBOfferingUserSectionDocument|null = snapshot.val();
    // If a workspace has already been created, or is currently been created, then its listeners are already set
    if (sectionDocument
          && !workspaces.getSectionWorkspace(sectionDocument.self.sectionId)
          && this.creatingWorkspaces.indexOf(sectionDocument.self.sectionId) === -1) {
      this.createWorkspaceFromSectionDocument(user.id, sectionDocument)
        .then((workspace) => {
          this.updateGroupUserSectionDocumentListeners(workspace);
          this.monitorSectionWorkspaceVisibility(workspace);
          return workspace;
        })
        .then(workspaces.addSectionWorkspace);
    }
  }

  private handleGroupsRef = (snapshot: firebase.database.DataSnapshot) => {
    const {user, workspaces} = this.stores;
    const groups: DBOfferingGroupMap = snapshot.val() || {};
    const myGroupIds: string[] = [];
    const overSubscribedUserUpdates: any = {};

    // ensure that the current user is not in more than 1 group and groups are not oversubscribed
    Object.keys(groups).forEach((groupId) => {
      const groupUsers = groups[groupId].users || {};
      const userKeys = Object.keys(groupUsers);
      if (userKeys.indexOf(user.id) !== -1) {
        myGroupIds.push(groupId);
      }
      if (userKeys.length > 4) {
        // sort the users by connected timestamp and find the newest users to kick out
        const users = userKeys.map((uid) => groupUsers[uid]);
        users.sort((a, b) => a.connectedTimestamp - b.connectedTimestamp);
        users.splice(0, 4);
        users.forEach((userToRemove) => {
          const userPath = this.getFullPath(this.getGroupUserPath(user, groupId, userToRemove.self.uid));
          overSubscribedUserUpdates[userPath] = null;
        });
      }
    });

    // if there is a problem with the groups fix the problem in the next timeslice
    const numUpdates = Object.keys(overSubscribedUserUpdates).length;
    if ((numUpdates > 0) || (myGroupIds.length > 1)) {
      setTimeout(() => {
        if (numUpdates > 0) {
          firebase.database().ref().update(overSubscribedUserUpdates);
        }
        if (myGroupIds.length > 1) {
          this.leaveGroup();
        }
      }, 1);
    }
    else {
      // otherwise set the groups
      this.stores.groups.updateFromDB(user.id, groups, this.stores.class);

      workspaces.sections.map(workspace => workspace.sectionId).forEach((sectionId) => {
        const workspace = workspaces.getSectionWorkspace(sectionId);
        if (workspace) {
          this.updateGroupUserSectionDocumentListeners(workspace);
        }
      });
    }
  }

  private setConnectionHandlers(userRef: firebase.database.Reference) {
    if (this.groupOnDisconnect) {
      this.groupOnDisconnect.cancel();
    }
    const groupDisconnectedRef = userRef.child("disconnectedTimestamp");
    this.groupOnDisconnect = groupDisconnectedRef.onDisconnect();
    this.groupOnDisconnect.set(firebase.database.ServerValue.TIMESTAMP);

    if (this.connectedRef) {
      this.connectedRef.off("value");
    }
    else if (!this.connectedRef) {
      this.connectedRef = firebase.database().ref(".info/connected");
    }
    // once() ensures that the connected timestamp is set before resolving
    return this.connectedRef.once("value", (snapshot) => {
        return this.handleConnectedRef(userRef, snapshot);
      })
      .then(() => {
        if (this.connectedRef) {
          this.connectedRef.on("value", (snapshot) => {
            this.handleConnectedRef(userRef, snapshot || undefined);
          });
        }
      });
  }

  private handleConnectedRef = (userRef: firebase.database.Reference, snapshot?: firebase.database.DataSnapshot, ) => {
    if (snapshot && snapshot.val()) {
      return userRef.child("connectedTimestamp").set(firebase.database.ServerValue.TIMESTAMP);
    }
  }

  private createWorkspaceFromSectionDocument(userId: string, sectionDocument: DBOfferingUserSectionDocument) {
    return this.openDocument(userId, sectionDocument.documentKey)
      .then((document) => {
        this.monitorDocumentModel(document);
        this.monitorDocumentRef(document);

        const workspace = SectionWorkspaceModel.create({
          mode: "1-up",
          tool: "select",
          sectionId: sectionDocument.self.sectionId,
          document,
          visibility: sectionDocument.visibility,
        });
        return workspace;
      });
  }

  private parseDocumentContent(document: DBDocument, deselect?: boolean): DocumentContentModelType|null {
    if (document.content == null) {
      return null;
    }

    const content = JSON.parse(document.content);
    // XXX: When Slate text loads with an active selection, it breaks.
    // When we load text from the DB, we actively deselect it to prevent this.
    // This is a hack until a better method for synchronizing state across MST, React, FB and Slate is developed
    if (deselect) {
      content.tiles.forEach((tile: ToolTileModelType) => {
        if (tile.content.type === "Text") {
          const tileContent = tile.content as TextContentModelType;
          if (typeof tileContent.text === "string") {
            tileContent.text = tileContent.text.replace('"isFocused":true', '"isFocused":false');
          }
        }
      });
    }
    return DocumentContentModel.create(content);
  }

  private monitorDocumentRef = (document: DocumentModelType) => {
    const { user, workspaces } = this.stores;
    const documentKey = document.key;
    const documentRef = this.ref(this.getUserDocumentPath(user, documentKey));

    const docListener = this.getOrCreateModelListener(`document:${documentKey}`);
    if (docListener.ref) {
      docListener.ref.off("value");
    }
    docListener.ref = documentRef;

    let initialLoad = true;
    documentRef.on("value", (snapshot) => {
      if (snapshot && snapshot.val()) {
        const updatedDoc: DBDocument = snapshot.val();
        const updatedContent = this.parseDocumentContent(updatedDoc, initialLoad);
        initialLoad = false;
        if (updatedContent) {
          const workspace = workspaces.getWorkspace(documentKey);
          if (workspace) {
            const workspaceDoc = workspace.document;
            workspaceDoc.setContent(updatedContent);
            this.monitorDocumentModel(workspaceDoc);
          }
        }
      }
    });
  }

  private monitorDocumentModel = (document: DocumentModelType) => {
    const { user } = this.stores;
    const { key, content } = document;

    const docListener = this.getOrCreateModelListener(`document:${key}`);
    if (docListener.modelDisposer) {
      docListener.modelDisposer();
    }

    const updateRef = this.ref(this.getUserDocumentPath(user, key));
    docListener.modelDisposer = (onSnapshot(content, (newContent) => {
      updateRef.update({
        content: JSON.stringify(newContent)
      });
    }));
  }

  private getOrCreateModelListener(uniqueKeyForModel: string) {
    if (!this.modelListeners[uniqueKeyForModel]) {
      this.modelListeners[uniqueKeyForModel] = {};
    }
    return this.modelListeners[uniqueKeyForModel];
  }

  private monitorSectionWorkspaceVisibility = (workspace: SectionWorkspaceModelType) => {
    const { user } = this.stores;
    const updateRef = this.ref(this.getSectionDocumentPath(user, workspace.sectionId));
    const disposer = (onSnapshot(workspace, (newWorkspace) => {
      updateRef.update({
        visibility: newWorkspace.visibility
      });
    }));
    this.workspaceModelDisposers[workspace.sectionId] = disposer;
  }

  private updateGroupUserSectionDocumentListeners(workspace: SectionWorkspaceModelType) {
    const { user, groups } = this.stores;
    const userGroup = groups.groupForUser(user.id);
    const groupUsers = userGroup && userGroup.users;
    if (groupUsers) {
      groupUsers.forEach((groupUser) => {
        if (groupUser.id === user.id) {
          return;
        }
        const currentSectionDocsListener = this.getOrCreateGroupUserSectionDocumentListeners(workspace, groupUser.id)
          .sectionDocsRef;
        if (currentSectionDocsListener) {
          currentSectionDocsListener.off();
        }
        const groupUserSectionDocsRef = this.ref(this.getSectionDocumentPath(user, workspace.sectionId, groupUser.id));
        this.getOrCreateGroupUserSectionDocumentListeners(workspace, groupUser.id)
          .sectionDocsRef = groupUserSectionDocsRef;
        groupUserSectionDocsRef.on("value", this.handleGroupUserSectionDocRef(workspace));
      });
    }
  }

  private handleGroupUserSectionDocRef(workspace: SectionWorkspaceModelType) {
    return (snapshot: firebase.database.DataSnapshot|null) => {
      const sectionDocument: DBOfferingUserSectionDocument = snapshot && snapshot.val();
      if (sectionDocument) {
        const groupUserId = sectionDocument.self.uid;
        const sectionId = sectionDocument.self.sectionId;
        const docKey = sectionDocument.documentKey;
        if (sectionDocument.visibility === "public") {
          const mainUser = this.stores.user;
          const currentDocContentListener = this.getOrCreateGroupUserSectionDocumentListeners(workspace, groupUserId)
              .docContentRef;
          if (currentDocContentListener) {
            currentDocContentListener.off();
          }
          const groupUserDocRef = this.ref(this.getUserDocumentPath(mainUser, docKey, groupUserId));
          this.getOrCreateGroupUserSectionDocumentListeners(workspace, groupUserId)
            .docContentRef = groupUserDocRef;
          groupUserDocRef.on("value", (docContentSnapshot) => {
            this.handleGroupUserDocRef(docContentSnapshot, workspace);
          });
        } else {
          workspace.clearGroupDocument(groupUserId);
        }
      }
    };
  }

  private handleGroupUserDocRef(snapshot: firebase.database.DataSnapshot|null, workspace: SectionWorkspaceModelType) {
    if (snapshot) {
      const rawGroupDoc: DBDocument = snapshot.val();
      if (rawGroupDoc) {
        const groupUserId = rawGroupDoc.self.uid;
        const {documentKey} = rawGroupDoc.self;
        this.openDocument(groupUserId, documentKey).then((groupUserDoc) => {
          workspace.setGroupDocument(groupUserId, groupUserDoc);
        });
      }
    }
  }

  private getOrCreateGroupUserSectionDocumentListeners(workspace: SectionWorkspaceModelType, userId: string) {
    const {sectionId} = workspace;
    if (!this.groupUserSectionDocumentsListeners[sectionId]) {
      this.groupUserSectionDocumentsListeners[sectionId] = {};
    }

    if (!this.groupUserSectionDocumentsListeners[sectionId][userId]) {
      this.groupUserSectionDocumentsListeners[sectionId][userId] = {};
    }

    return this.groupUserSectionDocumentsListeners[sectionId][userId];
  }

  private createWorkspaceFromLearningLog(learningLog: DBLearningLog) {
    const {title, self: {uid, documentKey}} = learningLog;
    return this.openDocument(uid, documentKey)
      .then((document) => {
        this.monitorDocumentModel(document);
        this.monitorDocumentRef(document);

        return LearningLogWorkspaceModel.create({
          tool: "select",
          title,
          document,
          createdAt: document.createdAt,
        });
      })
      .then((learningLogModel) => {
        // TODO: add model listener for renames
        return learningLogModel;
      });
  }

  private monitorLearningLogWorkspace = (learningLog: LearningLogWorkspaceModelType) => {
    const { user } = this.stores;
    const { key } = learningLog.document;

    const listener = this.getOrCreateModelListener(`learningLogWorkspace:${key}`);
    if (listener.modelDisposer) {
      listener.modelDisposer();
    }

    const updateRef = this.ref(this.getLearningLogPath(user, key));
    listener.modelDisposer = (onSnapshot(learningLog, (newLearningLog) => {
      updateRef.update({
        title: newLearningLog.title,
        // TODO: for future ordering story add original to model and update here
      });
    }));

    return learningLog;
  }
}
