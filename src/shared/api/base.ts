import { DefaultUser, getDefaultUser } from './mocks/default-user';

export class Api {
  async fetchUser(): Promise<DefaultUser> {
    return new Promise((resolve) => {
      resolve(getDefaultUser());
    });
  }
}
