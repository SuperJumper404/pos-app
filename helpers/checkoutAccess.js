const QR_CLIENT_ACCESSES = [2, 3]

const isQrClientAccess = (access) => QR_CLIENT_ACCESSES.includes(Number(access))

module.exports = {
  isQrClientAccess,
}
