const users = [
    { name: 'Alice', level: 'hard' },
    { name: 'Bob', level: 'easy' },
    { name: 'Charlie', level: 'medium' },
    { name: 'Dave', level: 'easy' },
  ];
  
  let sorted = [...users].sort((a,b)=> a.level.localeCompare(b.level));
  console.log(sorted);
  
  priorityOrder = {easy:1 , medium:2 , hard:3};
  
  sorted = [...users].sort((a,b)=> priorityOrder[a.level]-priorityOrder[b.level]);
  
  console.log(sorted);