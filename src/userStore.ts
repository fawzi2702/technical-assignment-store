import { IStore, Restrict, Store } from "./store";

interface IUserStore extends IStore<IUserStore> {
  name: string;
}

export class UserStore extends Store<IUserStore> {
  @Restrict("rw")
  name: string = "John Doe";

  constructor() {
    super();
    this.defaultPolicy = "rw";
  }
}
