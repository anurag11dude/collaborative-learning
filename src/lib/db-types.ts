// NOTE: see docs/firebase-schema.md to see a visual heirarchy of these interfaces

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

export interface DBDocumentMetadata {
  version: "1.0";
  self: {
    uid: string;
    documentKey: string;
  };
  createdAt: number;
  // TDB: serialized document model metadata (back pointers too)
}

export interface DBDocument {
  version: "1.0";
  self: {
    uid: string;
    documentKey: string;
  };
  // TDB: serialized document model contents
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
  sectionDocuments: DBOfferingUserSectionDocumentMap;
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
