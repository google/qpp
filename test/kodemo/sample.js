var notobj = {
  field: 6
};

notobj.field = 7;

notobj['field'] = 9;

notobj.field++;

notobj['field']++;

console.log(notobj.field);
