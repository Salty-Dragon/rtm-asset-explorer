## Raptoreum Commands And Returns



- getblockchaininfo

{

  "chain": "main",

  "blocks": 1279649,

  "headers": 1279649,

  "warnings": "",

  "bestblockhash": "8e68f5feb0779b4ac2571438545a92f92bb54801441312e0ec2f1700e92a1289",

  "difficulty": 0.4719535644070604,

  "mediantime": 1771021462,

  "verificationprogress": 0.9999996213387458,

  "initialblockdownload": false,

  "chainwork": "00000000000000000000000000000000000000000000000000194ba6c7145e24",

  "size_on_disk": 13281245263,

  "pruned": false,

  "softforks": [

  ],

  "rip1_softforks": {

​    "v17": {

​      "status": "active",

​      "start_height": 419328,

​      "round_size": 4032,

​      "voting_period": 1

​    },

​    "Round Voting": {

​      "status": "active",

​      "start_height": 905760,

​      "round_size": 720,

​      "voting_period": 7,

​      "miners": {

​        "mean_percentage": 92,

​        "weighted_yes": 46257120,

​        "weight": 5040,

​        "samples": 7,

​        "threshold": 85,

​        "approved": true

​      }

​    }

  }

}

- createasset

createasset asset_metadata

Create a new asset



Arguments:

1. "asset"               (string, required) A json object with asset metadata

{

   "name:"               (string) Asset name

   "updatable:"          (bool, optional, default=true) if true this asset can be modify using reissue process.

   "is_root:"            (bool, required) if this asset is root.

   "root_name:"          (string) the root asset name for this sub asset.

   "is_unique:"          (bool, optional, default=false) if true this is asset is unique it has an identity per token (NFT flag)

   "decimalpoint:"       (numeric) [0 to 8] has to be 0 if is_unique is true.

   "referenceHash:"      (string) hash of the underlying physical or digital assets, IPFS hash can be used here.

   "maxMintCount"        (numeric, required) number of times this asset can be mint

   "type:"               (numeric) distribution type manual=0, coinbase=1, address=2, schedule=3

   "targetAddress:"      (string) address to be issued to when asset issue transaction is created.

   "issueFrequency:"     (numeric) mint specific amount of token every x blocks

   "amount:"             (numeric, (max 500 for unique) amount to distribute each time if type is not manual.

   "ownerAddress:"       (string) address that this asset is owned by. Only key holder of this address will be able to mint new tokens

}

Result:

"txid"                   (string) The transaction id for the new asset

- getassetdetailsbyid e2a7e0bf67521e0fc5f193d4cca6bb293fb5085b4396d318544bd453e3aca74f

{

  "Asset_id": "e2a7e0bf67521e0fc5f193d4cca6bb293fb5085b4396d318544bd453e3aca74f",

  "Asset_name": "BITKNIVES",

  "Circulating_supply": 0,

  "MintCount": 0,

  "maxMintCount": 1,

  "owner": "RBsTfCrrRBRwbdmhRaiRpjrPRxNfZcUheo",

  "Isunique": false,

  "Updatable": true,

  "Decimalpoint": 0,

  "ReferenceHash": "",

  "Distribution": {

​    "Type": "manual",

​    "TargetAddress": "RBsTfCrrRBRwbdmhRaiRpjrPRxNfZcUheo",

​    "IssueFrequency": 0,

​    "Amount": 1

  }

}

- getassetdetailsbyname BITKNIVES

{

  "Asset_id": "e2a7e0bf67521e0fc5f193d4cca6bb293fb5085b4396d318544bd453e3aca74f",

  "Asset_name": "BITKNIVES",

  "Circulating_supply": 0,

  "MintCount": 0,

  "maxMintCount": 1,

  "owner": "RBsTfCrrRBRwbdmhRaiRpjrPRxNfZcUheo",

  "Isunique": false,

  "Updatable": true,

  "Decimalpoint": 0,

  "ReferenceHash": "",

  "Distribution": {

​    "Type": "manual",

​    "TargetAddress": "RBsTfCrrRBRwbdmhRaiRpjrPRxNfZcUheo",

​    "IssueFrequency": 0,

​    "Amount": 1

  }

}

- listassets help

listassets ( verbose "count" start )



Returns a list of all assets.



Arguments:

1. verbose    (boolean, optional, default=false) false: return list of asset names, true: return list of asset metadata
2. "count"    (string, optional, default=ALL) truncates results to include only the first _count_ assets found
3. start      (numeric, optional, default=0) results skip over the first _start_ assets found



Result (for verbose = false):

{                          (json object)

  "Asset_name" : {         (json object)

​    "Asset_id" : "str"     (string) The asset id

  }

}



Result (for verbose = true):

{                                 (json object)

  "Asset_name" : {                (json object)

​    "Asset_id" : "str",           (string) The asset id

​    "Asset_name" : "str",         (string) The Asset name

​    "Circulating_supply" : n,     (numeric) Current circulating supply of Asset

​    "MintCount" : n,              (numeric) Number of times this Asset was minted

​    "maxMintCount" : n,           (numeric) Maximum number of times this Asset can be minted

​    "owner" : "str",              (string) Address that owns this Asset

​    "Isunique" : true|false,      (boolean) Unique asset/NFT

​    "Updatable" : true|false,     (boolean) If the Asset can be updated in the future

​    "Decimalpoint" : n,           (numeric)

​    "ReferenceHash" : "str",      (string) Hash of the underlying physical or digital Assets

​    "Distribution" : {            (json object)

​      "type" : "str",             (string) Distribution type

​      "targetAddress" : "str",    (string) Target address where this Asset is deployed after minting

​      "issueFrequency" : n,       (numeric) How often the Asset is minted

​      "amount" : n                (numeric) Amount of the Asset that is minted

​    }

  }

}

- listassets true 2

{

  "TOKYO": {

​    "Asset_id": "000e6d25102432558a2e6b16fdd45a485c21d9cf753aac760af2dc5c055c2f16",

​    "Asset_name": "TOKYO",

​    "Circulating_supply": 0,

​    "MintCount": 0,

​    "maxMintCount": 1,

​    "owner": "REihvNAKppRkpcoojYi5LH7NYm9dgQtAZC",

​    "Isunique": false,

​    "Updatable": false,

​    "Decimalpoint": 0,

​    "ReferenceHash": "",

​    "Distribution": {

​      "Type": "manual",

​      "TargetAddress": "REihvNAKppRkpcoojYi5LH7NYm9dgQtAZC",

​      "IssueFrequency": 0,

​      "Amount": 1

​    }

  },

  "RTM1000.228A": {

​    "Asset_id": "0052b3097d088e9287a87764a34885754f691a8140c39d682fec20689c97c35c",

​    "Asset_name": "RTM1000.228A",

​    "Circulating_supply": 0,

​    "MintCount": 0,

​    "maxMintCount": 1,

​    "owner": "RGe92vAMUq2VDLzc5NbMfTy3crbwfDyZyJ",

​    "Isunique": true,

​    "Updatable": false,

​    "Decimalpoint": 0,

​    "ReferenceHash": "QmedoK39wj7E6dXSFuiWz4qQ8XSEA13VUaY4EC48n8GWda",

​    "Distribution": {

​      "Type": "manual",

​      "TargetAddress": "RGe92vAMUq2VDLzc5NbMfTy3crbwfDyZyJ",

​      "IssueFrequency": 0,

​      "Amount": 1

​    }

  }

}

- help listassetbalancesbyaddress

listassetbalancesbyaddress "address" (onlytotal) (count) (start)

Returns a list of all asset balances for an address.

Arguments:
1. "address"                  (string, required) a raptoreum address
2. "onlytotal"                (boolean, optional, default=false) when false result is just a list of assets balances -- when true the result is just a single number representing the number of assets
3. "count"                    (integer, optional, default=50000, MAX=50000) truncates results to include only the first _count_ assets found
4. "start"                    (integer, optional, default=0) results skip over the first _start_ assets found (if negative it skips back from the end)

Result:
{
  (asset_name) : (quantity),
  ...
}

Examples:
> raptoreum-cli listassetbalancesbyaddress "myaddress" false 2 0
> raptoreum-cli listassetbalancesbyaddress "myaddress" true
> raptoreum-cli listassetbalancesbyaddress "myaddress

- getaddressdeltas '{"addresses":["RWBh9TyTCDGgM8Zbcy83ghmZfb7XUEESjQ"],"asset":"ELECTRON"}'

{
    "satoshis": 1000000000000,
    "asset": "ELECTRON",
    "assetId": "894e49435466a85676c7b4be406b1fcfcaa9032aa766480fc856cf1194293627",
    "txid": "abfdf5de2e8e8f1ba220e3666b49b7ac22cd3eb536084c99fa06f7ee8026ea7b",
    "index": 0,
    "blockindex": 2,
    "height": 1248367,
    "address": "RWBh9TyTCDGgM8Zbcy83ghmZfb7XUEESjQ"
  },
  {
    "satoshis": -1000000000000,
    "asset": "ELECTRON",
    "assetId": "894e49435466a85676c7b4be406b1fcfcaa9032aa766480fc856cf1194293627",
    "txid": "7b45c715ca98ea570914cde0e56f3c3be8ba11ea928a540ab06068b4aafca568",
    "index": 0,
    "blockindex": 4,
    "height": 1248373,
    "address": "RWBh9TyTCDGgM8Zbcy83ghmZfb7XUEESjQ"
  }
]

- help createrawtransaction

createrawtransaction [{"txid":"hex","vout":n,"sequence":n},...] [{"address":amount},{"future_maturity":n,"future_locktime":n,"future_amount":n},{"assetid":"hex","uniqueid":n,"amount":amount,"future_maturity":n,"future_locktime":n},{"data":"hex"},...] ( locktime )

Create a transaction spending the given inputs and creating new outputs.
Outputs can be addresses or data.
Returns hex-encoded raw transaction.
Note that the transaction's inputs are not signed, and
it is not stored in the wallet or transmitted to the network.

Arguments:
1. inputs                         (json array, required) A json array of json objects
     [
       {                          (json object)
         "txid": "hex",           (string, required) The transaction id
         "vout": n,               (numeric, required) The output number
         "sequence": n,           (numeric, optional, default=) The sequence number
       },
       ...
     ]
2. outputs                        (json array, required) a json array with outputs (key-value pairs).
                                  That is, each address can only appear once and there can only be one 'data' object.
                                  For compatibility reasons, a dictionary, which holds the key-value pairs directly, is also
                                  accepted as second parameter.
     [
       {                          (json object)
         "address": amount,       (numeric or string, required) A key-value pair. The key (string) is the Raptoreum address, the value (float or string) is the amount in RTM
       },
       {                          (json object)
         "future_maturity": n,    (numeric, required) Number of confirmation for this future to mature.
         "future_locktime": n,    (numeric, required) Total time in seconds from its first confirmation for this future to mature.
         "future_amount": n,      (numeric, required) Raptoreum amount to be locked.
       },
       {                          (json object)
         "assetid": "hex",        (string, required) The asset identifier.
         "uniqueid": n,           (numeric) The asset unique id.
         "amount": amount,        (numeric or string, required) Amount to send.
         "future_maturity": n,    (numeric) Number of confirmation for this future to mature.
         "future_locktime": n,    (numeric) Total time in seconds from its first confirmation for this future to mature.
       },
       {                          (json object)
         "data": "hex",           (string, required) A key-value pair. The key must be "data", the value is hex-encoded data
       },
       ...
     ]
3. locktime                       (numeric, optional, default=0) Raw locktime. Non-0 value also locktime-activates inputs

Result:
"hex"    (string)  hex string of the transaction

Examples:
> raptoreum-cli createrawtransaction "[{\"txid\":\"myid\",\"vout\":0}]" "[{\"address\":0.01}]"
> raptoreum-cli createrawtransaction "[{\"txid\":\"myid\",\"vout\":0}]" "[{\"data\":\"00010203\"}]"
> curl --user myusername --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "createrawtransaction", "params": ["[{\"txid\":\"myid\",\"vout\":0}]", "[{\"address\":0.01}]"] }' -H 'content-type: text/plain;' http://127.0.0.1:10225/
> curl --user myusername --data-binary '{"jsonrpc": "1.0", "id":"curltest", "method": "createrawtransaction", "params": ["[{\"txid\":\"myid\",\"vout\":0}]", "[{\"data\":\"00010203\"}]"] }' -H 'content-type: text/plain;' http://127.0.0.1:10225/

