import { DB } from "../db";

export class DBLatestGroupIdListener {
  private db: DB;
  private latestGroupIdRef: firebase.database.Reference | null = null;

  constructor(db: DB) {
    this.db = db;
  }

  public start() {
    console.log(`DBLatestGroupIdListener.start() [begin]`);
    return new Promise<void>((resolve, reject) => {
      const latestGroupIdRef = this.latestGroupIdRef = this.db.firebase.getLatestGroupIdRef();
      // use once() so we are ensured that latestGroupId is set before we resolve
      console.log(`DBLatestGroupIdListener.start() [latestGroupIdRef.once("value")]`);
      latestGroupIdRef.once("value", (snapshot) => {
        console.log(`DBLatestGroupIdListener.start() [this.handleLatestGroupIdRef(snapshot)]`);
        this.handleLatestGroupIdRef(snapshot);
        console.log(`DBLatestGroupIdListener.start() [latestGroupIdRef.on("value")]`);
        latestGroupIdRef.on("value", this.handleLatestGroupIdRef);
      })
      .then(snapshot => {
        console.log(`DBLatestGroupIdListener.start() [resolve()]`);
        resolve();
      })
      .catch((error) => {
        console.log(`DBLatestGroupIdListener.start() [reject()] error: ${error}`);
        reject(error);
      });
    });
  }

  public stop() {
    if (this.latestGroupIdRef) {
      this.latestGroupIdRef.off("value");
      this.latestGroupIdRef = null;
    }
  }

  private handleLatestGroupIdRef = (snapshot: firebase.database.DataSnapshot) => {
    console.log(`DBLatestGroupIdListener.handleLatestGroupIdRef() [setLatestGroupId()]`);
    this.db.stores.user.setLatestGroupId(snapshot.val() || undefined);
  }
}
