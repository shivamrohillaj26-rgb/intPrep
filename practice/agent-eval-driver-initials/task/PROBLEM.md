# Driver avatar initials show one letter

Driver avatars in the accounts table should show two letters when both a first name and a last name exist.

Example: Jane Doe should render as `JD`.

Right now, when both names are present, the avatar shows only the first letter (`J`).

Empty names, a missing last name, and a missing first name already have their own rules. Do not change those.

Edit only `task/display-initials.ts`.
