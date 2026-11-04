import { Router, type IRouter } from "express";
import healthRouter from "./health";
import worldRouter from "./world";
import communityRouter from "./community";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(worldRouter);
router.use(communityRouter);
router.use(adminRouter);

export default router;
