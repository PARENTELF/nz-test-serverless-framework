import { APIGatewayAuthorizerEvent, Callback, Context } from 'aws-lambda';
import AuthService from './auth.service';

class TokenAuthorizerLambda {
  constructor() {}

  generateAuthResponse(principalId, effect, methodArn) {
    const policyDocument = this.generatePolicyDocument(effect, methodArn);

    return {
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      principalId,
      policyDocument,
    };
  }

  generatePolicyDocument(effect, methodArn) {
    if (!effect || !methodArn) return null;

    const policyDocument = {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: methodArn,
        },
      ],
    };

    return policyDocument;
  }

  async handle(
    event: APIGatewayAuthorizerEvent,
    _context: Context,
    callback: Callback
  ) {
    console.log('[Auth]index::handle ', JSON.stringify(event));

    const authService = new AuthService();
    let response;

    try {
      response = await authService.authenticate(event);
    } catch (err) {
      callback('Unauthorized');
    }

    return response;
  }
}

const tokenAuthorizerLambda = new TokenAuthorizerLambda();
export const handle = tokenAuthorizerLambda.handle.bind(tokenAuthorizerLambda);
