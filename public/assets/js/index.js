// Register service worker
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js").then((reg) => {
      console.log("Service worker registered.", reg);
    });
  });
}

let transactions = [];
let myChart;
const transactionForm = createTransactionForm();
const transactionApi = createTransactionApi();

initTransactions();

document.querySelector("#add-btn").onclick = function () {
  sendTransaction(true);
};

document.querySelector("#sub-btn").onclick = function () {
  sendTransaction(false);
};

function createTransactionForm() {
  const nameEl = document.querySelector("#t-name");
  const amountEl = document.querySelector("#t-amount");
  const errorEl = document.querySelector(".form .error");

  const showError = (message) => {
    errorEl.textContent = message;
  };

  // Error message
  const validate = () => {
    // Validate form
    if (nameEl.value === "" || amountEl.value === "") {
      showError("Missing Information");
      return false;
    }
    showError("");
    return true;
  };

  // Returns the transaction object from the input
  const transaction = () => {
    return {
      name: nameEl.value,
      value: amountEl.value,
      date: new Date().toISOString(),
    };
  };

  // Clear info
  const clear = () => {
    nameEl.value = "";
    amountEl.value = "";
    showError("");
  };

  return Object.freeze({ transaction, validate, clear, showError });
}

function createTransactionApi() {
  const create = (transaction) => {
    return fetch("/api/transaction", {
      method: "POST",
      body: JSON.stringify(transaction),
      headers: {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json",
      },
    }).then((response) => {
      return response.json();
    });
  };

  const fetchAll = () => {
    return fetch("/api/transaction").then((response) => {
      return response.json();
    });
  };
  return Object.freeze({ create, fetchAll });
}

function initTransactions() {
  transactionApi.fetchAll().then((data) => {
    // save db data on global variable
    transactions = data;

    renderTransactionsChart();
  });
}

function sendTransaction(isAdding) {
  if (!transactionForm.validate()) {
    return;
  }

  // Creates records
  const transaction = transactionForm.transaction();

  // Converts amount to negative number if removing funds
  if (!isAdding) {
    transaction.value *= -1;
  }

  // Adds to beginning of current array of data
  transactions.unshift(transaction);

  // Re-run logic to populate ui with new record
  populateChart();
  populateTable();
  populateTotal();

  // Transaction API
  transactionApi
    .create(transaction)
    .then((data) => {
      if (data.errors) {
        transactionForm.showError("Missing Information");
      } else {
        transactionForm.clear();
      }
    })
    .catch(() => {
      saveRecord(transaction);
      transactionForm.clear();
    });
}

function renderTransactionsChart() {
  populateTotal();
  populateTable();
  populateChart();
}

function populateTotal() {
  const total = transactions.reduce((total, t) => {
    return total + parseInt(t.value);
  }, 0);

  const totalEl = document.querySelector("#total");
  totalEl.textContent = total;
}

function populateTable() {
  const tbody = document.querySelector("#tbody");
  tbody.innerHTML = "";

  transactions.forEach((transaction) => {
    // Create and populate table
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${transaction.name}</td>
      <td>${transaction.value}</td>
    `;

    tbody.appendChild(tr);
  });
}

function populateChart() {
  // copies the array and then reverses it
  const reversed = transactions.slice().reverse();
  let sum = 0;

  // Adds the date to the graph
  const labels = reversed.map((t) => {
    const date = new Date(t.date);
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
  });

  // Create incremental values for the graph
  const data = reversed.map((t) => {
    sum += parseInt(t.value);
    return sum;
  });

  // Removes the old graph if it still exists
  if (myChart) {
    myChart.destroy();
  }

  const ctx = document.getElementById("myChart").getContext("2d");

  myChart = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Total Over Time",
          fill: true,
          backgroundColor: "#6666ff",
          data,
        },
      ],
    },
  });
}
