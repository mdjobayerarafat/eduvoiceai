import { NextResponse } from 'next/server';
import { Client, Users } from 'node-appwrite';

const client = new Client();
client
  .setEndpoint(process.env.APPWRITE_ENDPOINT!) // Your Appwrite Endpoint
  .setProject(process.env.APPWRITE_PROJECT_ID!) // Your project ID
  .setKey(process.env.APPWRITE_API_KEY!); // Your secret API key

const users = new Users(client);

export async function GET() {
  try {
    const response = await users.list();
    return NextResponse.json(response.users);
  } catch (error) {
    console.error('Error fetching users from Appwrite:', error);
    return NextResponse.json({ message: 'Error fetching users' }, { status: 500 });
  }
}