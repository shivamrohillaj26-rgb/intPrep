import { Component, ElementRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-chat-bot',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat-bot.html',
  styleUrl: './chat-bot.css',
})
export class ChatBot {
  chatBody = viewChild<ElementRef<HTMLDivElement>>('chatBody');

  chatHistory: any[] = [];
  message = '';

  sendMessage() {
    this.chatHistory.push({ message: this.message, sender: 'user' });
    this.message = '';
    this.scrollToBottom();
  }

  scrollToBottom() {
    // wait one tick so *ngFor paints the new message first
    setTimeout(() => {
      const el = this.chatBody()?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    });
  }
}
