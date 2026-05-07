### pnpm monorepo：

1. 只发布真正的库子包  
你的可发布子包在 packages 下面；示例应用在 apps 下面，不建议发布。  
根包 package.json 是 private true，这没问题。

2. 登录 npm 并检查权限  
先执行：
npm login
npm whoami

如果是首次发布 @modbus-ts 作用域，确保你对该 scope 有发布权限。

3. 先做发布前校验  
在仓库根目录执行：
pnpm install
pnpm build
pnpm test

4. 批量升级所有库子包版本  
例如全部升一个 patch：
pnpm -r --filter "./packages/*" exec npm version patch --no-git-tag-version

如果你想统一成同一个明确版本，比如 0.2.0：
pnpm -r --filter "./packages/*" exec npm version 0.2.0 --no-git-tag-version

5. 先 dry-run 看将要发布什么  
pnpm -r --filter "./packages/*" publish --access public --dry-run --no-git-checks

6. 正式发布全部子包  
pnpm -r --filter "./packages/*" publish --access public --no-git-checks

补充说明：
1. pnpm 会按依赖拓扑递归发布，适合你的 workspace:* 互相依赖场景。  
2. 建议发布前先提交一次版本变更；如果工作区是脏的，用 no-git-checks 才能发。  
3. 你现在已经给各子包补了 description/author/license/homepage/repository/bugs，元信息层面已就绪。
