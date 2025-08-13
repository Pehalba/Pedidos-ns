export class FirebaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.init();
  }

  init() {
    try {
      // Configuração do Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyAN5qBPlmVAEYzB1Z9lTdgTBcQpv7APtj8",
        authDomain: "produtos-ns-66a51.firebaseapp.com",
        projectId: "produtos-ns-66a51",
        storageBucket: "produtos-ns-66a51.firebasestorage.app",
        messagingSenderId: "133963604352",
        appId: "1:133963604352:web:3fc7566d99373348c62165"
      };

      // Inicializar Firebase
      firebase.initializeApp(firebaseConfig);
      this.db = firebase.firestore();
      this.isInitialized = true;
      
      console.log("Firebase inicializado com sucesso!");
    } catch (error) {
      console.error("Erro ao inicializar Firebase:", error);
      this.isInitialized = false;
    }
  }

  // Métodos para Orders
  async getOrders() {
    if (!this.isInitialized) return [];
    
    try {
      const snapshot = await this.db.collection('orders').get();
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return [];
    }
  }

  async addOrder(orderData) {
    if (!this.isInitialized) return null;
    
    try {
      const docRef = await this.db.collection('orders').add({
        ...orderData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao adicionar pedido:", error);
      return null;
    }
  }

  async updateOrder(orderId, orderData) {
    if (!this.isInitialized) return false;
    
    try {
      await this.db.collection('orders').doc(orderId).update({
        ...orderData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar pedido:", error);
      return false;
    }
  }

  async deleteOrder(orderId) {
    if (!this.isInitialized) return false;
    
    try {
      await this.db.collection('orders').doc(orderId).delete();
      return true;
    } catch (error) {
      console.error("Erro ao deletar pedido:", error);
      return false;
    }
  }

  // Métodos para Batches
  async getBatches() {
    if (!this.isInitialized) return [];
    
    try {
      const snapshot = await this.db.collection('batches').get();
      return snapshot.docs.map(doc => ({
        code: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error("Erro ao buscar lotes:", error);
      return [];
    }
  }

  async addBatch(batchData) {
    if (!this.isInitialized) return null;
    
    try {
      const docRef = await this.db.collection('batches').add({
        ...batchData,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error("Erro ao adicionar lote:", error);
      return null;
    }
  }

  async updateBatch(batchCode, batchData) {
    if (!this.isInitialized) return false;
    
    try {
      await this.db.collection('batches').doc(batchCode).update({
        ...batchData,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error("Erro ao atualizar lote:", error);
      return false;
    }
  }

  async deleteBatch(batchCode) {
    if (!this.isInitialized) return false;
    
    try {
      await this.db.collection('batches').doc(batchCode).delete();
      return true;
    } catch (error) {
      console.error("Erro ao deletar lote:", error);
      return false;
    }
  }

  // Sincronização com localStorage
  async syncToLocalStorage() {
    if (!this.isInitialized) return;
    
    try {
      const orders = await this.getOrders();
      const batches = await this.getBatches();
      
      localStorage.setItem('orders', JSON.stringify(orders));
      localStorage.setItem('batches', JSON.stringify(batches));
      
      console.log("Dados sincronizados com localStorage");
    } catch (error) {
      console.error("Erro ao sincronizar com localStorage:", error);
    }
  }

  async syncFromLocalStorage() {
    if (!this.isInitialized) return;
    
    try {
      const orders = JSON.parse(localStorage.getItem('orders') || '[]');
      const batches = JSON.parse(localStorage.getItem('batches') || '[]');
      
      // Sincronizar pedidos
      for (const order of orders) {
        await this.addOrder(order);
      }
      
      // Sincronizar lotes
      for (const batch of batches) {
        await this.addBatch(batch);
      }
      
      console.log("Dados do localStorage sincronizados com Firebase");
    } catch (error) {
      console.error("Erro ao sincronizar do localStorage:", error);
    }
  }
}
