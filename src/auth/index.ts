import { APIGatewayAuthorizerEvent, Callback, Context } from 'aws-lambda';
import AuthService from './auth.service';

class TokenAuthorizerLambda {
  async handle(
    event: APIGatewayAuthorizerEvent,
    _context: Context,
    callback: Callback
  ) {
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
