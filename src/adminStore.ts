import { lazy } from "./lazy";
import { IStore, Restrict, Store } from "./store";
import { UserStore } from "./userStore";

interface IAdminStore extends IStore<IAdminStore> {
  user: UserStore;
  name: string;
  getCredentials: () => Store<IAdminStore>;
}

export class AdminStore extends Store<IAdminStore> {
  @Restrict("r")
  public user: UserStore;

  name: string = "John Doe";
  @Restrict("rw")
  getCredentials = lazy(() => {
    const credentialStore = new Store();
    credentialStore.writeEntries({ username: "user1" });
    return credentialStore;
  });

  constructor(user: UserStore) {
    super();
    this.defaultPolicy = "none";
    this.user = user;
  }
}
