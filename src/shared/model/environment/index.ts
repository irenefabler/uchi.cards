export class Environment {
  public static get basePath() {
    return this._getEnv('VITE_BASE_PATH');
  }

  protected static _getEnv(key: string) {
    const env = import.meta.env[key];
    if (!env) throw Error(`Env "${key}" not defined`);
    return String(env);
  }
}
