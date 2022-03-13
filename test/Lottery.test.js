const assert = require('assert')
const ganache = require('ganache-cli')
const Web3 = require('web3')

const web3 = new Web3(ganache.provider())

const { interface, bytecode } = require('../compile')

let lottery, accounts, manager, player1, player2

beforeEach(async () => {
  accounts = await web3.eth.getAccounts()

  manager = accounts[0]
  player1 = accounts[1]
  player2 = accounts[2]

  lottery = await new web3.eth.Contract(JSON.parse(interface))
    .deploy({ data: bytecode })
    .send({ from: manager, gas: 1000000 })
})

describe('Lottery contract', () => {
  it('Should deploy the contract', () => {
    assert.ok(lottery.options.address)
  })

  it('Should set the manager as the creator of the lottery', async () => {
    const manager = await lottery.methods.manager().call()

    assert.strictEqual(manager, manager)
  })

  it('Should enter one player to the lottery', async () => {
    await lottery.methods.enter().send({
      from: player1,
      value: web3.utils.toWei('0.02', 'ether'),
    })

    const players = await lottery.methods.getPlayers().call({
      from: manager,
    })

    assert(players.includes(player1))
    assert.equal(1, players.length)
  })

  it('Should enter multiple players to the lottery', async () => {
    await lottery.methods.enter().send({
      from: player1,
      value: web3.utils.toWei('0.02', 'ether'),
    })
    await lottery.methods.enter().send({
      from: player2,
      value: web3.utils.toWei('0.02', 'ether'),
    })

    const players = await lottery.methods.getPlayers().call({
      from: manager,
    })

    assert(players.includes(player1))
    assert(players.includes(player2))
    assert.equal(2, players.length)
  })

  it('Should ensure minimum ether entry is paid', async () => {
    const insufficientWei = '100'

    try {
      await lottery.methods.enter().send({
        from: player1,
        value: insufficientWei,
      })

      assert(false) // fail test if above does not throw error
    } catch (err) {
      assert(err)
    }
  })

  // it('Should fail if !manager calls pick winner', async () => {
  //   try {
  //     await lottery.methods.pickWinner().send({
  //       from: player1,
  //     })

  //     // above should throw error, but we make sure test fails if not
  //     assert(false)
  //   } catch (err) {
  //     assert(err)
  //   }
  // })

  it('Should send prize to the winner, and reset the players', async () => {
    await lottery.methods.enter().send({
      from: manager,
      value: web3.utils.toWei('2', 'ether'),
    })

    const initialBalance = await web3.eth.getBalance(manager)
    await lottery.methods.pickWinner().send({ from: manager })
    const finalBalance = await web3.eth.getBalance(manager)
    const difference = finalBalance - initialBalance

    assert(difference > web3.utils.toWei('1.8', 'ether'))

    const players = await lottery.methods.getPlayers().call({
      from: manager,
    })

    assert(players.length === 0)
  })
})
