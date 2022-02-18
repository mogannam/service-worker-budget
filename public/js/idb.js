// create a var to hold the DB object for offline storage
let db;
//service-worker-budget-DB
const request = indexedDB.open('service-worker-budget-DB', 1);
//create a offline object to cach our new budget in an offline DB
request.onupgradeneeded = function(event) {
  const db = event.target.result;
  //budget-obj-store
  db.createObjectStore('budget-obj-store', { autoIncrement: true });
};
request.onsuccess = function(event) {
  // when db is successfully created with its object store (from onupgradedneeded event above), save reference to db in global variable
  db = event.target.result;
  // check if app is online, if yes run checkDatabase() function to send all local db data to api
  if (navigator.onLine) {
    uploadBudget();
  }
};
request.onerror = function(event) {
  // log error here
  console.log(event.target.errorCode);
};
// helper function to save objects to local offline DB
function saveRecord(record) {
  const transaction = db.transaction(['budget-obj-store'], 'readwrite');
  const budgetObjectStore = transaction.objectStore('budget-obj-store');
  // add record to your store with add method.
  budgetObjectStore.add(record);
}
// when the internet conection is restored, this helper function
// pushes local DB to the real DB
function uploadBudget() {
  // open a transaction on your pending db
  const transaction = db.transaction(['budget-obj-store'], 'readwrite');
  // access your pending object store
  const budgetObjectStore = transaction.objectStore('budget-obj-store');
  // get all records from store and set to a variable
  const getAll = budgetObjectStore.getAll();
  getAll.onsuccess = function() {
    // if there was data in indexedDb's store, let's send it to the api server
    if (getAll.result.length > 0) {
      fetch('/api/transaction', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(serverResponse => {
          if (serverResponse.message) {
            throw new Error(serverResponse);
          }
          const transaction = db.transaction(['budget-obj-store'], 'readwrite');
          const budgetObjectStore = transaction.objectStore('budget-obj-store');
          // clear all items in your store
          budgetObjectStore.clear();
        })
        .catch(err => {
          // set reference to redirect back here
          console.log(err);
        });
    }
  };
}
// listen for app coming back online
window.addEventListener('online', uploadBudget);