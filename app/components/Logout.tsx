export const Logout = () => {
  localStorage.setItem('credentials', '')
  location.pathname = '/'
  return null
}
