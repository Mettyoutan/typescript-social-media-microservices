import { logger } from "../utils/logger.utils";
import { db } from '../db/pg.db';
import { posts } from '../db/schema/post.schema';
import { Request, Response, NextFunction } from 'express';
import { type AuthenticatedRequestBody } from '../types/authenticated-req.types';
import { type PostInput, validatePostInput } from '../types/post.types';
import { generateUUID } from "../utils/uuid-generator.utils";
import { HttpError } from "../middlleware/error.handler";


/**
 * #### Create post controller
 * @description
 * ```
 * Create a new single post with post's body
 * ```
 *
 * @param req
 * @param res
 * @param next
 */
export async function createPost(req: Request<{}, {}, AuthenticatedRequestBody<PostInput>>, res: Response, next: NextFunction) {
    logger.debug('User is creating new post', req.body);

    try {
        // GET THE USER ID
        const { userId } = req.body;

        // GET THE USER POST
        const post: PostInput = {
            content: req.body.content,
            mediaIds: req.body.mediaIds || [] // mediaIds must at least have an empty array
        }

        const validatedPost = await validatePostInput(post);

        // SAVE THE POST INTO 'posts' DB
        const [postRecord] = await db.insert(posts)
            .values({
            id: generateUUID(),
            userId,
            content: validatedPost.content,
            mediaIds: validatedPost.mediaIds
        })
            .returning({
            id: posts.id,
            userId: posts.userId,
            content: posts.content,
            mediaIds: posts.mediaIds
        });

        if (!postRecord) throw new HttpError('Could not save the post to DB', 400);

        // SEND AN EVENT TO BROADCAST DATA
        

        logger.debug('Successfully created post', req.body);

        return res.status(201).json({
            success: true,
            message: 'Successfully created post',
            data: {
                ...postRecord
            }
        })

    } catch (e) {
        logger.error('Error creating post', e)
        next(e);
    }
}

export async function getPosts(req: Request<{}, {}, AuthenticatedRequestBody<{}>, {skip: number, limit: number}>, res: Response, next: NextFunction) {
    try {
        logger.debug('User is fetching all posts', req.body);

        // GET THE USER ID
        const userId = req.body.userId;

        // GET THE QUERY PARAMETER FOR PAGINATION
        const { skip, limit } = req.query;

        const postRecords = await db.select().from(posts).offset(skip).limit(limit);

        if (!postRecords.length) throw new HttpError('Could not find any posts', 404);

        

        return res.status(200).json({
            success: true,
            message: 'Successfully fetching posts',
            data: {}
        })

    } catch (e) {
        logger.error('Error fetching posts', e)
        next(e);
    }
}

export async function getPost(req: Request, res: Response, next: NextFunction) {
    try {

    } catch (e) {
        logger.error('Error fetching post', e)
        next(e);
    }
}

export async function deletePost(req: Request, res: Response, next: NextFunction) {
    try {

    } catch (e) {
        logger.error('Error deleting post', e)
        next(e);
    }
}
