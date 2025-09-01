import {SignJWT} from "jose";
import crypto from "crypto";

export async function generateToken(userId: string) {
    const accessTokenExpiration: number = Date.now() + 60 * 60 * 1000; // 1 hour from now()
    const accessKey = new TextEncoder().encode(process.env.JWT_ACCESS_TOKEN_SECRET_KEY!);

    try {
        // generate an access token
        const newAccessToken = await new SignJWT({userId})
            .setProtectedHeader({alg: 'HS256'})
            .setIssuedAt().setExpirationTime(accessTokenExpiration).sign(accessKey); // using a public crypto keys

        const newRefreshToken = crypto.randomBytes(40).toString('hex');

        // const newHashedRefreshToken = crypto.hash('sha256', newRefreshToken);
        return { newAccessToken, newRefreshToken };
    } catch (e) {
        throw e;
    }
}