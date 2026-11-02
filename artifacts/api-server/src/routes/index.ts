import { Router, type IRouter } from "express";
import healthRouter from "./health";
import worldRouter from "./world";
import communityRouter from "./community";

const router: IRouter = Router();

router.use(healthRouter);
router.use(worldRouter);
router.use(communityRouter);

export default router;
