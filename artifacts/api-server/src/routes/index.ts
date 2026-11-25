import { Router, type IRouter } from "express";
import healthRouter from "./health";
import worldRouter from "./world";
import communityRouter from "./community";
import adminRouter from "./admin";
import observerTestRouter from "./observer-test";


import nilepostTestRouter from "./nilepost-test";

const router: IRouter = Router();


router.use(healthRouter);
router.use(worldRouter);
router.use(communityRouter);
router.use(adminRouter);
router.use(observerTestRouter);


router.use(nilepostTestRouter);

export default router;
