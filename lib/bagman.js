class Bagman {
  constructor(api, bags = [], resFun = null, resFail = null, oneFun = null, oneFail = null) {
    this.bags = bags;
    this.api = api;
    this.success = false;
    this.result = false;
    this.resFun = !!resFun ? resFun : false;
    this.resFail = !!resFail ? resFail : false;
    this.oneFun = !!oneFun ? oneFun : false;
    this.oneFail = !!oneFail ? oneFail : false;
  }

  async conMan(contract, action, data, actor, permission = 'active', oneFun = this.oneFun, oneFail = this.oneFail) {
    let actions;
    try {
      actions = [{
        account: contract,
        name: action,
        authorization: [{ actor, permission }],
        data,
      }];
      const result = await this.api.transact({ actions }, { blocksBehind: 3, expireSeconds: 120 });
      this.result = result;
      this.success = true;
      if (this.oneFun && this.result.processed.error_code == null) oneFun(this.result);
    } catch (e) {
      if (oneFail) oneFail(this.oneFail(actions, this.result));
      else if (this.oneFail) oneFail(actions, this.result);
      console.log('oneFail error', e.message);
      this.result = e;
      this.success = false;
    }
  }

  async batMan(batch) {
    const actionsObj = batch.map((actDat) => ({
      account: actDat.contract,
      name: actDat.action,
      authorization: [{ actor: actDat.actor, permission: actDat.permission }],
      data: actDat.data,
    }));
    try {
      const result = await this.api.transact({ actions: actionsObj }, { blocksBehind: 1, expireSeconds: 120 });
      this.result = result;
      this.success = true;
      if (!!this.resFun && this.result.processed.error_code == null) this.resFun(this.result);
    } catch (e) {
      if (!!this.resFail) this.resFail(this.bags, actionsObj);
      console.log('resfail error', e.message);
      this.result = e;
      this.success = false;
    }
  }
}

module.exports = Bagman;
