import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cart',
  imports: [FormsModule , CommonModule],
  templateUrl: './cart.html',
  styleUrl: './cart.css',
})
export class Cart {

  items = [
    {
      name: 'Product 1',
      price: 100,
      quantity: 1,
    },
    {
      name: 'Product 2',
      price: 200,
      quantity: 1,
    },
  ];
  cartItems: any[] = [];
  total = 0;

  addToCart(item: any) {
    if(this.cartItems.find(i => i.name === item.name)) {
      this.cartItems.find(i => i.name === item.name).quantity++;
    } else {
      this.cartItems.push({...item, quantity: 1});
    }
    this.calculateTotal();
  }

  calculateTotal() {
    this.total = this.cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

}
