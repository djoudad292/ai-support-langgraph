import { WebSocketGateway, WebSocketServer, SubscribeMessage, OnGatewayConnection, OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class WebsocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join_conversation')
  handleJoin(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string; userId: string }) {
    client.join(data.conversationId);
    this.userSockets.set(data.userId, client.id);
    this.logger.log(`User ${data.userId} joined conversation ${data.conversationId}`);
    return { success: true };
  }

  @SubscribeMessage('send_message')
  handleMessage(@ConnectedSocket() client: Socket, @MessageBody() data: { conversationId: string; content: string; senderType: string }) {
    this.server.to(data.conversationId).emit('receive_message', {
      conversationId: data.conversationId,
      content: data.content,
      senderType: data.senderType,
      timestamp: new Date().toISOString(),
    });
    return { success: true };
  }

  broadcastToConversation(conversationId: string, event: string, payload: any) {
    this.server.to(conversationId).emit(event, payload);
  }
}