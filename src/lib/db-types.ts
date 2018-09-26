// NOTE: see docs/firebase-schema.md to see a visual hierarchy of these interfaces

export interface DBPortalUser {
  version: "1.0";
  self: {
    uid: string
  };
  latestGroupId: string;
  documentMetadata: DBDocumentMetadataMap;
  documents: DBDocumentMap;
}

export interface DBDocumentMetadataMap {
  // documentKey is same value as DBDocumentMap
  [key /* documentKey */: string]: DBDocumentMetadata;
}

export interface DBDocumentMap {
  // documentKey is generated by push to DBDocumentMap
  [key /* documentKey */: string]: DBDocument;
}

export type DBUserDocumentType = "section" | "learningLog";
export type DBOfferingDocumentType = "published";
export type DBDocumentType = DBUserDocumentType | DBOfferingDocumentType;

export interface DBDocumentMetadata {
  version: "1.0";
  self: {
    documentKey: string;
  };
  createdAt: number;
  type: DBDocumentType;
}

export interface DBUserDocumentMetadata extends DBDocumentMetadata {
  self: {
    uid: string;
    documentKey: string;
  };
  type: DBUserDocumentType;
}
export interface DBSectionDocumentMetadata extends DBUserDocumentMetadata {
  type: "section";
  classHash: string;
  offeringId: string;
}
export interface DBLearningLogDocumentMetadata extends DBUserDocumentMetadata {
  type: "learningLog";
}

export interface DBOfferingDocumentMetadata extends DBDocumentMetadata {
  self: {
    documentKey: string;
    classHash: string;
    offeringId: string;
  };
  type: DBOfferingDocumentType;
}
export interface DBPublishedDocumentMetadata extends DBOfferingDocumentMetadata {
  type: "published";
  groupId: string;
  onlineUserIds: string[];
  offlineUserIds: string[];
}

export interface DBLearningLog {
  version: "1.0";
  self: {
    uid: string;
    documentKey: string;
  };
  title: string;
}

export interface DBDocument {
  version: "1.0";
  self: {
    documentKey: string;
  };
  content?: string;
  type: DBDocumentType;
}

export interface DBUserDocument extends DBDocument {
  self: {
    uid: string;
    documentKey: string;
  };
  type: DBUserDocumentType;
}

export interface DBSectionDocument extends DBUserDocument {
  type: "section";
}

export interface DBLearningLogDocument extends DBUserDocument {
  type: "learningLog";
}

export interface DBOfferingDocument extends DBDocument {
  self: {
    classHash: string;
    offeringId: string;
    documentKey: string;
  };
  type: DBOfferingDocumentType;
}

export interface DBPublishedDocument extends DBOfferingDocument {
  type: "published";
}

export interface DBClass {
  version: "1.0";
  self: {
    classHash: string;
  };
  offerings: DBOfferingMap;
}

export interface DBOfferingMap {
  [key /* offeringId */: string]: DBOffering;
}

export interface DBOffering {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
  };
  users: DBOfferingUserMap;
  groups: DBOfferingGroupMap;
}

export interface DBOfferingUserMap {
  [key /* uid */: string]: DBOfferingUser;
}

export interface DBOfferingGroupMap {
  [key /* groupId */: string]: DBOfferingGroup;
}

export interface DBOfferingUser {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    uid: string;
  };
  sectionDocuments?: DBOfferingUserSectionDocumentMap;
  // TDB: store ui information here?
}

export interface DBOfferingUserSectionDocumentMap {
  [key /* sectionId */: string]: DBOfferingUserSectionDocument;
}

export interface DBOfferingUserSectionDocument {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    uid: string;
    sectionId: string;
  };
  visibility: "public" | "private";
  documentKey: string; // firebase id of portal user document
}

export interface DBOfferingGroup {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    groupId: string;
  };
  users?: DBOfferingGroupUserMap;
}

export interface DBOfferingGroupUserMap {
  [key /* uid */: string]: DBOfferingGroupUser;
}

export interface DBOfferingGroupUser {
  version: "1.0";
  self: {
    classHash: string;
    offeringId: string;
    groupId: string;
    uid: string;
  };
  connectedTimestamp: number;
  disconnectedTimestamp?: number;
}
