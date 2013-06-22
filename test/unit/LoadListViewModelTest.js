var loadListViewModel = QuerypointPanel.LoadListViewModel.initialize();
loadListViewModel.onBeginLoad(1);
console.assert(loadListViewModel.loadStartedNumber() === 1);
console.assert(loadListViewModel.loadEndedNumber() === 0);

loadListViewModel.onEndLoad(1);

console.assert(loadListViewModel.loadStartedNumber() === 1);
console.assert(loadListViewModel.loadEndedNumber() === 1);

console.assert(loadListViewModel.showLoad() === loadListViewModel.lastLoad());
console.assert(loadListViewModel.currentLoadIsSelected());