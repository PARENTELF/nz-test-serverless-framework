export const {
  JWT_ALGORITHM_TYPE,
  REGION,
  USER_POOLS_ID,
  USER_POOLS_WEB_CLIENT_ID,
} = process.env;

export const ISSUER = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOLS_ID}`;
export const JWKS_URI = `https://cognito-idp.${REGION}.amazonaws.com/${USER_POOLS_ID}/.well-known/jwks.json`;
