export class FirebaseService {
  constructor() {
    this.db = null;
    this.isInitialized = false;
    this.quotaExceeded = false;
    this.init();
  }

  // Realtime listeners
  onOrdersSnapshot(callback) {
    if (!this.isInitialized || !this.db) return () => {};
    try {
      const unsubscribe = this.db.collection("orders").onSnapshot(
        (snap) => {
          const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          callback(orders);
        },
        (error) => {
          console.error("Erro no listener de pedidos:", error);
        }
      );
      return unsubscribe;
    } catch (e) {
      console.error("Erro ao iniciar listener de pedidos:", e);
      return () => {};
    }
  }

  init() {
    try {
      // Verificar se o Firebase já foi inicializado
      if (firebase.apps.length > 0) {
        this.db = firebase.firestore();
        this.isInitialized = true;
        console.log("Firebase já inicializado, reutilizando conexão");
        return;
      }

      // Configuração do Firebase
      const firebaseConfig = {
        apiKey: "AIzaSyAN5qBPlmVAEYzB1Z9lTdgTBcQpv7APtj8",
        authDomain: "produtos-ns-66a51.firebaseapp.com",
        projectId: "produtos-ns-66a51",
        storageBucket: "produtos-ns-66a51.firebasestorage.app",
        messagingSenderId: "133963604352",
        appId: "1:133963604352:web:3fc7566d99373348c62165",
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
      const snapshot = await this.db.collection("orders").get();
      return snapshot.docs.map((doc) => ({
        id: doc.id, // Agora doc.id é o ID do pedido
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Erro ao buscar pedidos:", error);
      return [];
    }
  }

  async addOrder(orderData) {
    if (!this.isInitialized) return null;
    try {
      // Usar o ID do pedido como ID do documento
      await this.db
        .collection("orders")
        .doc(orderData.id)
        .set({
          ...orderData,
          createdAt: orderData.createdAt || new Date().toISOString(),
          updatedAt: orderData.updatedAt || new Date().toISOString(),
        });
      return orderData.id;
    } catch (error) {
      if (error.code === "resource-exhausted") {
        console.warn("Cota do Firebase excedida ao adicionar pedido");
        this.quotaExceeded = true;
      } else {
        console.error("Erro ao adicionar pedido:", error);
      }
      return null;
    }
  }

  async updateOrder(orderId, orderData) {
    if (!this.isInitialized)
      return { success: false, error: "Firebase não inicializado" };
    try {
      await this.db
        .collection("orders")
        .doc(orderId)
        .update({
          ...orderData,
          updatedAt: orderData.updatedAt || new Date().toISOString(),
        });
      return { success: true };
    } catch (error) {
      if (error.code === "resource-exhausted") {
        console.warn("Cota do Firebase excedida ao atualizar pedido");
        this.quotaExceeded = true;
        return { success: false, error: "quota-exceeded" };
      } else {
        console.error("Erro ao atualizar pedido:", error);
        return { success: false, error: error.message };
      }
    }
  }

  async deleteOrder(orderId) {
    if (!this.isInitialized) return false;

    try {
      await this.db.collection("orders").doc(orderId).delete();
      return true;
    } catch (error) {
      if (error.code === "resource-exhausted") {
        console.warn("Cota do Firebase excedida ao deletar pedido");
        this.quotaExceeded = true;
      } else {
        console.error("Erro ao deletar pedido:", error);
      }
      return false;
    }
  }

  // Métodos para Batches
  async getBatches() {
    if (!this.isInitialized) return [];

    try {
      const snapshot = await this.db.collection("batches").get();
      return snapshot.docs.map((doc) => ({
        code: doc.id, // Agora doc.id é o código do lote
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Erro ao buscar lotes:", error);
      return [];
    }
  }

  async addBatch(batchData) {
    if (!this.isInitialized)
      return { success: false, error: "Firebase não inicializado" };

    try {
      // Usar o código do lote como ID do documento
      await this.db
        .collection("batches")
        .doc(batchData.code)
        .set({
          ...batchData,
          createdAt: batchData.createdAt || new Date().toISOString(),
          updatedAt: batchData.updatedAt || new Date().toISOString(),
        });
      return { success: true, id: batchData.code };
    } catch (error) {
      if (error.code === "resource-exhausted") {
        console.warn("Cota do Firebase excedida ao adicionar lote");
        this.quotaExceeded = true;
        return { success: false, error: "quota-exceeded" };
      } else {
        console.error("Erro ao adicionar lote:", error);
        return { success: false, error: error.message };
      }
    }
  }

  async updateBatch(batchCode, batchData) {
    if (!this.isInitialized) return false;

    try {
      await this.db
        .collection("batches")
        .doc(batchCode)
        .update({
          ...batchData,
          updatedAt: batchData.updatedAt || new Date().toISOString(),
        });
      return true;
    } catch (error) {
      if (error.code === "resource-exhausted") {
        console.warn("Cota do Firebase excedida ao atualizar lote");
        this.quotaExceeded = true;
      } else {
        console.error("Erro ao atualizar lote:", error);
      }
      return false;
    }
  }

  async deleteBatch(batchCode) {
    if (!this.isInitialized) return false;

    try {
      await this.db.collection("batches").doc(batchCode).delete();
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

      // Usar a mesma chave que o Store usa
      const data = {
        orders: orders,
        batches: batches,
      };
      localStorage.setItem("consolidador:v1", JSON.stringify(data));

      console.log("Dados sincronizados com localStorage");
    } catch (error) {
      console.error("Erro ao sincronizar com localStorage:", error);
    }
  }

  async syncFromLocalStorage() {
    if (!this.isInitialized) return;

    try {
      const data = JSON.parse(localStorage.getItem("consolidador:v1") || "{}");
      const orders = data.orders || [];
      const batches = data.batches || [];

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

  // Métodos para fornecedores
  async getSuppliers() {
    try {
      const snapshot = await this.db.collection("suppliers").get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Erro ao buscar fornecedores:", error);
      return [];
    }
  }

  async addSupplier(supplierData) {
    try {
      // Usar o ID do fornecedor como ID do documento
      await this.db
        .collection("suppliers")
        .doc(supplierData.id)
        .set(supplierData);
      return supplierData.id;
    } catch (error) {
      console.error("Erro ao adicionar fornecedor:", error);
      throw error;
    }
  }

  async updateSupplier(id, supplierData) {
    try {
      await this.db.collection("suppliers").doc(id).update(supplierData);
      return true;
    } catch (error) {
      console.error("Erro ao atualizar fornecedor:", error);
      throw error;
    }
  }

  async deleteSupplier(id) {
    try {
      await this.db.collection("suppliers").doc(id).delete();
      return true;
    } catch (error) {
      console.error("Erro ao excluir fornecedor:", error);
      throw error;
    }
  }
}
