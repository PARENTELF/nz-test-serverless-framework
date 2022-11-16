import { APIGatewayAuthorizerEvent, PolicyDocument } from 'aws-lambda';

import { decode, JwtHeader, verify, VerifyOptions } from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
import { ISSUER, JWKS_URI, JWT_ALGORITHM_TYPE } from './constants';

interface IDecode {
  header: JwtHeader;
  payload: IPayload;
  signature: string;
}

interface IPayload {
  iss: string;
  sub: string;
  scope?: unknown;
}

export default class AuthService {
  private readonly jwksUri: string;
  private readonly issuer: string;
  private readonly jwtAlgorithmType: string;

  constructor() {
    this.jwksUri = JWKS_URI;
    this.issuer = ISSUER;
    this.jwtAlgorithmType = JWT_ALGORITHM_TYPE ?? '256';
  }

  private getToken = (event: APIGatewayAuthorizerEvent): string => {
    if (!event.type || event.type !== 'TOKEN') {
      throw new Error('Expected "event.type" parameter to have value "TOKEN"');
    }

    const tokenString = event.authorizationToken;
    if (!tokenString) {
      throw new Error(
        'Expected "event.authorizationToken" parameter to be set'
      );
    }

    const match = tokenString.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
      throw new Error(
        `Invalid Authorization token - ${tokenString} does not match "Bearer .*"`
      );
    }
    return match[1];
  };

  private getSigningKey = (kid: string): Promise<string> => {
    const client = jwks({
      cache: true,
      cacheMaxEntries: 100,
      cacheMaxAge: 3600,
      jwksUri: this.jwksUri,
    });

    return new Promise((resolve, reject) => {
      client.getSigningKey(kid, (error, key) => {
        if (error) {
          reject(error);
        }
        if (key && 'publicKey' in key) {
          resolve(key.publicKey);
        } else if (key && 'rsaPublicKey' in key) {
          resolve(key.rsaPublicKey);
        }
      });
    });
  };

  private getPolicyDocument = (
    effect: string,
    resource: string
  ): PolicyDocument => {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource,
        },
      ],
    };
  };

  async authenticate(event: APIGatewayAuthorizerEvent) {
    try {
      const token = this.getToken(event);
      const decoded = decode(token, { complete: true }) as IDecode;

      if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new Error('invalid token');
      }

      const options = {
        issuer: this.issuer,
        algorithms: [this.jwtAlgorithmType],
        client_id: 'lol',
      } as VerifyOptions;

      return this.getSigningKey(decoded.header.kid)
        .then((key) => verify(token, key, options) as IPayload)
        .then((decoded: IPayload) => {
          return {
            principalId: decoded?.sub,
            policyDocument: this.getPolicyDocument('Allow', event.methodArn),
            context: { scope: decoded.scope },
          };
        });
    } catch (ex: any) {
      //handle the exception!!!
      TODO: console.log(ex, ex.message);
    }
  }
}

const authService = new AuthService();
export const authenticate = authService.authenticate.bind(authService);
