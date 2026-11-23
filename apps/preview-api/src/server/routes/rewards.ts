import type { Ctx, Router } from "../router";
import type { ApiResult } from "../types";
import { HttpError, disabled } from "../http";
import { rewards } from "../data/account";

function ownRewards(ctx: Ctx) {
  const claims = ctx.session();
  if (ctx.params.userId !== claims.sub) throw new HttpError(403, "You can only view your own rewards.");
  return rewards();
}

export function rewardRoutes(r: Router): void {
  r.get("/rewards/:userId", (ctx): ApiResult<"getAllRewards"> => ownRewards(ctx));
  r.get("/rewards/:userId/milestones", (ctx): ApiResult<"getReferralMilestones"> => ownRewards(ctx).filter((x) => x.section === "MILESTONES"));
  r.get("/rewards/:userId/your-rewards", (ctx): ApiResult<"getYourRewards"> => ownRewards(ctx).filter((x) => x.section === "YOUR_REWARDS"));
  r.get("/rewards/:userId/more-rewards", (ctx): ApiResult<"getMoreRewards"> => ownRewards(ctx).filter((x) => x.section === "MORE_REWARDS"));
  r.post("/rewards/:userId/:rewardType", (ctx) => {
    ownRewards(ctx);
    disabled();
  });
}
