import express, { Router } from 'express';
import {
    createPost, getPosts, getPost, deletePost
} from '../controllers/post.controller';
import { authMiddleware } from "../middlleware/auth.middleware";

const router: Router = express.Router();

router.use(authMiddleware);

router.post('/create-post', createPost);

router.get('/find-posts', getPosts);

export default router;