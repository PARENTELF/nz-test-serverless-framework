import { APIGatewayEvent, APIGatewayProxyResultV2 } from 'aws-lambda';
import { S3 } from 'aws-sdk';

if (!process.env.BUCKET)
  throw new Error('Environment variable Bucket name is required.');

type GetPresignedPostUrlParams = {
  fileType: string;
  filePath: string;
};

class Uploader {
  async handle(event: APIGatewayEvent): Promise<APIGatewayProxyResultV2> {
    console.log('Event is', JSON.stringify(event, null, 2));

    try {
      if (!event.queryStringParameters?.fileType)
        throw new Error(
          'Querystring parameter fileType must be provided when creating a presigned URL, i.e. ?fileType=image/png'
        );

      const { fileType } = event.queryStringParameters;
      const filePath = generateId();
      const presignedPost = await createPresignedPost({ fileType, filePath });

      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...presignedPost,
          filePath,
        }),
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: error.message }),
        };
      }
      return {
        statusCode: 400,
        body: JSON.stringify({ error: JSON.stringify(error) }),
      };
    }
  }
}

export function createPresignedPost({
  fileType,
  filePath,
}: GetPresignedPostUrlParams): Promise<S3.PresignedPost> {
  const params = {
    Bucket: process.env.BUCKET,
    Fields: { key: filePath, acl: 'public-read' },
    Conditions: [
      ['content-length-range', 0, 1000000],
      ['eq', '$Content-Type', fileType],
    ],
    Expires: 15,
  };

  const s3 = getS3Instance();
  return s3.createPresignedPost(params) as unknown as Promise<S3.PresignedPost>;
}

const generateId = () => {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!-.*()';
  const length = 10;

  const charactersLength = characters.length;
  for (let i = 0; i < length; i += 1) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  const date = new Date().toISOString().split('T')[0].replace(/-/g, '');
  return `${date}_${result}`;
};

const getS3Instance = () => {
  return process.env.ENV === 'local'
    ? new S3({ endpoint: process.env.BUCKET_ENDPOINT })
    : new S3();
};

const uploader = new Uploader();
export const handle = uploader.handle.bind(uploader);
